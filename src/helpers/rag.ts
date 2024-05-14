import loggy from './loggy'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'

let docs: any
let hnsw: any

export const rag = async (question: string) => {
  const loader = new SitemapLoader(sitemapUrl, {
    selector: '.article-content', //extract article content only,
  })

  if (!docs) {
    docs = await loader.load()
    loggy(`[knowledge_base] loaded sitemap`)
  }

  const limitedDocs = docs.filter((d: any) => d.pageContent).slice(0, 50)
  if (!hnsw) {
    hnsw = await HNSWLib.fromDocuments(limitedDocs, new OpenAIEmbeddings())
    loggy(`[knowledge_base] fed vector store`)
  }

  const retriever = hnsw.asRetriever()
  const results = await retriever.getRelevantDocuments(question)
  loggy(`[knowledge_base] queried the vector store`)

  return results
}
