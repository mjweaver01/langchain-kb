import fs from 'fs'
import loggy from './loggy'
import fuzzysort from 'fuzzysort'
import { OpenAIEmbeddings } from '@langchain/openai'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { Document } from '@langchain/core/documents'
import { SitemapLoader } from 'langchain/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'
import { supabase } from './supabase'
import sitemapDocs from '../assets/sitemap_docs.json'

const smd = JSON.parse(JSON.stringify(sitemapDocs))
let docs: Document[] = smd.length > 0 ? smd : []
async function getDocs(writeFile = false) {
  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    const loader = new SitemapLoader(sitemapUrl, {
      selector: '.article-content', //extract article content only,
    })

    docs = await loader.load()
    if (writeFile) fs.writeFileSync('src/assets/sitemap_docs.json', JSON.stringify(docs, null, 2))
    loggy(`[sitemap] loaded sitemap`)
  }
}

export async function populate(useSupabase = false, writeFile = false) {
  // try to get docs from supabase first
  const existingDocs = (await supabase.from('documents').select('*')).data || []
  if (useSupabase && existingDocs.length > 0) {
    docs = existingDocs
    loggy(`[populate] retrieved documents from supabase`)
  } else {
    await getDocs(writeFile)
  }
}

export const vector = async (question: string) => {
  loggy(`[vector] searching "${question}"`)

  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    await populate()
  }

  // manual filter before sending to embeddings
  if (Array.isArray(docs) && docs.length > 0) {
    // presort results
    // this slims down the results to fit our context window
    const d = fuzzysort
      .go(question, docs, {
        threshold: 0,
        all: true,
        keys: ['pageContent', 'metadata.title', 'metadata.description', 'metadata.source'],
      })
      .map((x) => ({ score: x.score, ...x.obj }))
      .slice(0, 10)

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

// -----------
// RAG – WORK IN PROGRESS
// The question is: how to feed it all the 420+ entries?
// -----------

function chunker(arr: any[], size: number) {
  let result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
async function populateDocs() {
  loggy(`[rag] populating supabase`)
  const chunkedDocs = chunker(docs, 49)
  // @TODO this always fails after the first chunk
  // when chunk is larger than ~25 docs, due to context window
  // chunking doesn't help :(
  for (const chunk of chunkedDocs) {
    const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-large' })
    const store = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'documents',
      queryName: 'match_documents',
    })

    const vectors = await store.addDocuments(chunk)
    await supabase.from('documents').upsert(vectors)
  }
  loggy(`[rag] fed vector store with ${docs.length} documents`)
}

export const rag = async (question: string) => {
  loggy(`[rag] searching "${question}"`)

  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    await populate(true)
    await populateDocs()
  }

  if (Array.isArray(docs) && docs.length > 0) {
    const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-large' })
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
