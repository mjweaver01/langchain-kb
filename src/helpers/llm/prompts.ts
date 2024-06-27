import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { gistSystemPrompt, kbToolPrompt, kbSystemPrompt, systemPrompt } from '../constants'
import langfuse from '../langfuse'

export const generatePromptTemplate = (sentPrompt: string, isAnthropic?: boolean) => {
  return ChatPromptTemplate.fromMessages(
    isAnthropic
      ? [
          ['system', sentPrompt],
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
export const kbSystemPromptTemplate = (isAnthropic = false) =>
  generatePromptTemplate(compiledKbSystemPrompt, isAnthropic)
const remoteKbToolPrompt = await langfuse.getPrompt('KB_TOOL_PROMPT')
export const compiledKbToolPrompt = remoteKbToolPrompt.prompt
  ? remoteKbToolPrompt.prompt
  : kbToolPrompt
