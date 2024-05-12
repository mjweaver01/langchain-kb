// import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { Calculator } from '@langchain/community/tools/calculator'
import { DynamicTool } from '@langchain/community/tools/dynamic'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import langfuse from './langfuse'
import {
  sitemapUrl,
  wikipediaPrompt,
  sitemapPrompt,
  gistSystemPrompt,
  kbSystemPrompt,
  systemPrompt,
} from './constants'

const generatePromptTemplate = (sentPrompt: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', sentPrompt],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])

const remoteSystemPrompt = await langfuse.getPrompt('System_Prompt')
const compiledSystemPrompt = remoteSystemPrompt.prompt ? remoteSystemPrompt.prompt : systemPrompt
const kbPrompt = await langfuse.getPrompt('KB_SYSTEM_PROMPT')
const compiledKbSystemPrompt = kbPrompt.prompt ? kbPrompt.prompt : kbSystemPrompt
export const gptSystemPromptTemplate = generatePromptTemplate(compiledSystemPrompt)
export const gistSystemPromptTemplate = generatePromptTemplate(gistSystemPrompt)
export const kbSystemPromptTemplate = generatePromptTemplate(compiledKbSystemPrompt)

const knowledgeBaseLoader = new DynamicTool({
  name: 'knowledge_base',
  description: sitemapPrompt,
  func: async (question: string, runManager, meta) => {
    const sessionId = meta?.configurable?.sessionId

    const trace = langfuse.trace({
      name: 'knowledge_base',
      input: JSON.stringify(question),
      sessionId,
    })

    const generation = trace.generation({
      name: 'knowledge_base',
      input: JSON.stringify(question),
      model: 'knowledge_base',
    })

    try {
      generation.update({
        completionStartTime: new Date(),
      })

      const loader = new SitemapLoader(sitemapUrl)
      const docs = await loader.load()
      const result = JSON.stringify(docs[0])

      generation.end({
        output: JSON.stringify(result),
        level: 'DEFAULT',
      })

      trace.update({
        output: JSON.stringify(result),
      })

      return result
    } catch (error) {
      generation.end({
        output: JSON.stringify(error),
        level: 'ERROR',
      })

      trace.update({
        output: JSON.stringify(error),
      })

      return 'Error in sitemap'
    } finally {
      await langfuse.shutdownAsync()
    }
  },
})

const WikipediaQuery = new DynamicTool({
  name: 'wikipedia',
  description: wikipediaPrompt,
  func: async (question: string, runManager, meta) => {
    const sessionId = meta?.configurable?.sessionId

    const trace = langfuse.trace({
      name: 'wikipedia',
      input: JSON.stringify(question),
      sessionId,
    })

    const generation = trace.generation({
      name: 'wikipedia',
      input: JSON.stringify(question),
      model: 'wikipedia',
    })

    try {
      generation.update({
        completionStartTime: new Date(),
      })

      const wikipediaQuery = new WikipediaQueryRun({
        topKResults: 1,
        maxDocContentLength: 500,
      })

      const result = await wikipediaQuery.call(question)

      generation.end({
        output: JSON.stringify(result),
        level: 'DEFAULT',
      })

      trace.update({
        output: JSON.stringify(result),
      })

      return result
    } catch (error) {
      generation.end({
        output: JSON.stringify(error),
        level: 'ERROR',
      })

      trace.update({
        output: JSON.stringify(error),
      })

      return 'Error in wikipediaQuery'
    } finally {
      await langfuse.shutdownAsync()
    }
  },
})

export const tools = [WikipediaQuery, new Calculator()]

export const kbTools = [knowledgeBaseLoader]
