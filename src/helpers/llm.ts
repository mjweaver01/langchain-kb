import { ChatOpenAI } from '@langchain/openai'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import { tools, kbTools } from './tools'
import { fourOModel, threeModel } from './constants'

export const llm = (newModal: boolean = false) =>
  new ChatOpenAI({
    model: newModal ? fourOModel : threeModel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
  })

export const modelWithFunctions = llm(true).bind({
  functions: tools.map((tool) => convertToOpenAIFunction(tool)),
})

export const kbModelWithFunctions = llm(true).bind({
  functions: kbTools.map((tool) => convertToOpenAIFunction(tool)),
})
