import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import langfuse from '../langfuse'
import { gistSystemPrompt, kbToolPrompt, kbSystemPrompt, systemPrompt } from '../constants'

export const generatePromptTemplate = (sentPrompt: string, isAnthropic?: boolean) => {
  return ChatPromptTemplate.fromMessages(
    isAnthropic
      ? [
          ['system', 'You are a helpful assistant'],
          ['placeholder', '{chat_history}'],
          ['human', '{input}'],
          ['placeholder', '{agent_scratchpad}'],
        ]
      : [
          ['system', sentPrompt],
          new MessagesPlaceholder('chat_history'),
          ['human', '{input}'],
          new MessagesPlaceholder('agent_scratchpad'),
        ],
  )
}

const remoteSystemPrompt = await langfuse.getPrompt('System_Prompt')
const compiledSystemPrompt = remoteSystemPrompt.prompt ? remoteSystemPrompt.prompt : systemPrompt
const kbPrompt = await langfuse.getPrompt('KB_SYSTEM_PROMPT')
const compiledKbSystemPrompt = kbPrompt.prompt ? kbPrompt.prompt : kbSystemPrompt
export const gptSystemPromptTemplate = generatePromptTemplate(compiledSystemPrompt)
export const gistSystemPromptTemplate = generatePromptTemplate(gistSystemPrompt)
// export const kbSystemPromptTemplate = generatePromptTemplate(compiledKbSystemPrompt)
export const kbSystemPromptTemplate = async (isAnthropic = false) =>
  await generatePromptTemplate(compiledKbSystemPrompt, isAnthropic)
const remoteKbToolPrompt = await langfuse.getPrompt('KB_TOOL_PROMPT')
export const compiledKbToolPrompt = remoteKbToolPrompt.prompt
  ? remoteKbToolPrompt.prompt
  : kbToolPrompt
