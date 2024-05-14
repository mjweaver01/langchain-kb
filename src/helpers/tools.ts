import loggy from './loggy'
import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { Calculator } from '@langchain/community/tools/calculator'
import { DynamicTool } from '@langchain/community/tools/dynamic'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
// import { OpenAIEmbeddings } from '@langchain/openai'
// import { MemoryVectorStore } from 'langchain/vectorstores/memory'
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

//@todo put this in supabase
let kbVectorStore: any
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

      try {
        const loader = new SitemapLoader(sitemapUrl)
        const docs = await loader.load()
        const limitedDocs = docs.slice(0, 500).map((doc, i) => ({
          ...doc,
          metadata: {
            name: doc.metadata.title ?? doc.metadata.url ?? i,
            ...doc.metadata,
            id: i,
          },
          pageContent: doc.pageContent, //@todo extract content only,
        }))
        const limitedString = JSON.stringify(limitedDocs).substring(0, 100)
        loggy(`[knowledge_base] loaded sitemap`)

        generation.end({
          output: limitedString,
          level: 'DEFAULT',
        })

        trace.update({
          output: limitedString,
        })

        return JSON.stringify(limitedDocs)

        // try {
        //   if (!kbVectorStore) {
        //     kbVectorStore = await MemoryVectorStore.fromTexts(
        //       // @NOTE: we need to slice the docs array to avoid out of memory error
        //       limitedDocs.map((doc) =>
        //         JSON.stringify(doc.pageContent }),
        //       ),
        //       new OpenAIEmbeddings(),
        //     )
        //     loggy(`[knowledge_base] fed vector store`)
        //   }

        //   const result = await kbVectorStore.similaritySearch(JSON.stringify(question), 1)
        //   loggy(`[knowledge_base] queried the vector store`)

        //   return limitedDocs
        // } catch (error) {
        //   console.log(error)
        //   loggy(`[knowledge_base] error in vector store`)
        //   return limitedDocs
        // }
      } catch (error) {
        loggy(`[knowledge_base] error in the sitemap`)
        throw error
      }
    } catch (error) {
      generation.end({
        output: JSON.stringify(error),
        level: 'ERROR',
      })

      trace.update({
        output: JSON.stringify(error),
      })

      return '[knowledge_base] error in sitemap'
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
      loggy(`[wikipedia] ${JSON.stringify(result).substring(0, 100)}`)

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

      return '[wikipedia] error in wikipediaQuery'
    } finally {
      await langfuse.shutdownAsync()
    }
  },
})

export const tools = [WikipediaQuery, new Calculator()]

export const kbTools = [knowledgeBaseLoader]
