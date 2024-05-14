import loggy from './loggy'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'

let docs: any
export const vector = async (question: string) => {
  loggy(`[vector] searching "${question}"`)

  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    const loader = new SitemapLoader(sitemapUrl, {
      selector: '.article-content', //extract article content only,
    })

    docs = await loader.load()
    loggy(`[vector] loaded sitemap`)
  }

  if (Array.isArray(docs) && docs.length > 0) {
    let d = docs
      .filter((d: any) => d.pageContent && d.metadata)
      .filter((d: any) => JSON.stringify(d)?.indexOf(question) >= 1)
      .slice(0, 5)

    if (d.length === 0) {
      const qArray = question.split(' ').filter((v) => v.length > 2)
      d = docs
        .filter((d: any) => d.pageContent && d.metadata)
        .filter((d: any) =>
          qArray.some(
            (v) => d.metadata.title?.indexOf(v) >= 1 || d.metadata.description?.indexOf(v) >= 1,
          ),
        )
        .slice(0, 5)
    }

    const hnsw = await HNSWLib.fromDocuments(d, new OpenAIEmbeddings())
    loggy(`[vector] fed vector store`)

    const results = await hnsw.similaritySearch(question)
    loggy(`[vector] queried the vector store`)

    return results
  }

  loggy(`[vector] no documents found`)
  return []
}
