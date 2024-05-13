import langfuse from './langfuse'
import { supabase } from './supabase'
import {
  tools,
  kbTools,
  gptSystemPromptTemplate,
  gistSystemPromptTemplate,
  kbSystemPromptTemplate,
} from './tools'
import { modelWithFunctions } from './llm'
import { defaultQuestion } from './constants'
import random from './idGenerator'
import loggy from './loggy'

// langchain stuff
import { RunnableSequence } from '@langchain/core/runnables'
import { AgentExecutor, type AgentStep } from 'langchain/agents'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { formatToOpenAIFunctionMessages } from 'langchain/agents/format_scratchpad'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'

export const ask = async (
  input: string,
  source: SourceType,
  conversationId?: string,
): Promise<Answer> => {
  loggy(`[${source}] Asking: ${JSON.stringify(input).substring(0, 100)}`)

  const isGist = source === 'gist'
  const isKb = source === 'kb'

  const currentPromptTemplate = isKb
    ? kbSystemPromptTemplate
    : isGist
    ? gistSystemPromptTemplate
    : gptSystemPromptTemplate
  const currentModelWithFunctions = modelWithFunctions

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('source', source)
  const messages = data?.[0]?.messages ?? []
  const chatHistory: BaseMessage[] = messages.map((message: { role: string; content: string }) => {
    if (message.role === 'ai') {
      return new AIMessage(JSON.stringify(message.content))
    } else {
      return new HumanMessage(JSON.stringify(message.content))
    }
  })

  const runnableAgent = RunnableSequence.from([
    {
      input: (i: { input: string; steps: AgentStep[] }) => i.input,
      agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
        formatToOpenAIFunctionMessages(i.steps),
      chat_history: (i: any) => i.chat_history,
    },
    currentPromptTemplate,
    currentModelWithFunctions,
    new OpenAIFunctionsAgentOutputParser(),
  ])

  const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools: isKb ? kbTools : tools,
  })
  const invokee = await executor.invoke(
    {
      input,
      chat_history: chatHistory,
    },
    {
      configurable: { sessionId: conversationId },
    },
  )

  // save to supabase
  if (conversationId && messages.length > 0) {
    const { error } = await supabase
      .from('conversations')
      .update([
        {
          messages: [
            ...messages,
            { role: 'user', content: invokee.input },
            { role: 'ai', content: invokee.output },
          ],
        },
      ])
      .eq('id', conversationId)

    if (error) {
      loggy(error.message, true)
    }
  } else {
    const { error } = await supabase.from('conversations').upsert({
      id: conversationId,
      source,
      messages: [
        ...messages,
        { role: 'user', content: invokee.input },
        { role: 'ai', content: invokee.output },
      ],
    })

    if (error) {
      loggy(error.message, true)
    }
  }

  return {
    ...(invokee as any),
    conversationId,
    source,
  }
}

export async function askQuestion(
  input: string = defaultQuestion,
  source: SourceType,
  conversationId?: string,
): Promise<Answer> {
  const sessionId = conversationId || random()
  const trace = langfuse.trace({
    name: `ask-${source}`,
    input: JSON.stringify(input),
    sessionId,
    metadata: {
      source,
    },
  })

  const response = await ask(input, source, sessionId)

  trace.update({
    output: JSON.stringify(response?.output ?? response),
  })

  await langfuse.shutdownAsync()

  return response
}
