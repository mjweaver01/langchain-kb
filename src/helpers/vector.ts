import loggy from './loggy'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'

let docs: any
let hnsw: any

export const vector = async (question: string) => {
  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    const loader = new SitemapLoader(sitemapUrl, {
      selector: '.article-content', //extract article content only,
    })

    docs = await loader.load()
    loggy(`[knowledge_base] loaded sitemap`)
  }

  if (Array.isArray(docs) && docs.length > 0) {
    const qArray = question.split(' ').filter((v) => v.length > 2)

    const d = docs
      .filter((d: any) => d.pageContent && d.metadata)
      .filter((d: any) => qArray.some((v) => JSON.stringify(d).indexOf(v) >= 0))
      .slice(0, 50)

    if (!hnsw) {
      hnsw = await HNSWLib.fromDocuments(d, new OpenAIEmbeddings())
      loggy(`[knowledge_base] fed vector store`)
    }

    const retriever = hnsw.asRetriever()
    const results = await retriever.getRelevantDocuments(question)
    loggy(`[knowledge_base] queried the vector store`)

    return results
  }

  loggy(`[knowledge_base] no documents found`)
  return []
}
