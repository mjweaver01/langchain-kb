import { ChatOpenAI } from '@langchain/openai'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import { tools } from './tools'
import { threeModel, fourModel } from './constants'

export const llm = (newModel: boolean = false) =>
  new ChatOpenAI({
    model: newModel ? fourModel : threeModel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: newModel ? 0.2 : 0,
  })

export const modelWithFunctions = llm().bind({
  functions: tools.map((tool) => convertToOpenAIFunction(tool)),
})

export const newModelWithFunctions = llm(true).bind({
  functions: tools.map((tool) => convertToOpenAIFunction(tool)),
})
