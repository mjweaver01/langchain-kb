import loggy from './loggy'
import { OpenAIEmbeddings } from '@langchain/openai'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'
import { supabase } from './supabase'

const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-large' })

function chunker(arr: any[], size: number) {
  let result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

let docs: any
async function getDocs() {
  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    const loader = new SitemapLoader(sitemapUrl, {
      selector: '.article-content', //extract article content only,
    })

    docs = await loader.load()
    loggy(`[sitemap] loaded sitemap`)
  }
}

async function populateDocs() {
  loggy(`[rag] populating supabase`)
  const chunkedDocs = chunker(docs, 100)
  for (const chunk of chunkedDocs) {
    await supabase.from('documents').upsert(chunk)
  }
  loggy(`[rag] fed vector store with ${docs.length} documents`)
}

export async function populate() {
  // try to get docs from supabase first
  const existingDocs = (await supabase.from('documents').select('*')).data || []
  if (existingDocs.length > 0) {
    docs = existingDocs
    loggy(`[populate] retrieved documents from supabase`)
  } else {
    await getDocs()
    await populateDocs()
  }
}

export const rag = async (question: string) => {
  loggy(`[rag] searching "${question}"`)

  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    await populate()
  }

  if (Array.isArray(docs) && docs.length > 0) {
    const store = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'documents',
      queryName: 'match_documents',
    })

    const results = await store.similaritySearch(question, 1)
    loggy(`[rag] queried the vector store`)
    return results
  }

  loggy(`[rag] no documents found`)
  return []
}

// non-RAG vector search
export const vector = async (question: string) => {
  loggy(`[vector] searching "${question}"`)

  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    await populate()
  }

  if (Array.isArray(docs) && docs.length > 0) {
    let d = docs
      .filter((d: any) => d.pageContent && d.metadata)
      .filter((d: any) => JSON.stringify(d)?.indexOf(question) >= 1)
      .slice(0, 10)

    if (d.length === 0) {
      const qArray = question.split(' ').filter((v) => v.length > 2)
      d = docs
        .filter((d: any) => d.pageContent && d.metadata)
        .filter((d: any) =>
          qArray.some(
            (v) => d.metadata.title?.indexOf(v) >= 1 || d.metadata.description?.indexOf(v) >= 1,
          ),
        )
        .slice(0, 10)
    }

    const hnsw = await HNSWLib.fromDocuments(
      d,
      new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
      }),
    )
    loggy(`[vector] fed vector store`)

    const results = await hnsw.similaritySearch(question, 1)
    loggy(`[vector] queried the vector store`)

    return results
  }

  loggy(`[vector] no documents found`)
  return []
}
