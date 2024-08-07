import fs from 'fs'
import loggy from './loggy'
import fuzzysort from 'fuzzysort'
import { OpenAIEmbeddings } from '@langchain/openai'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { Document } from '@langchain/core/documents'
import { SitemapLoader } from '@langchain/community/document_loaders/web/sitemap'
import { sitemapUrl } from './constants'
import { supabase } from './supabase'
import sitemapDocs from '../assets/sitemap_docs.json'

const OPEN_AI_LIMIT = 10
const ANTHROPIC_LIMIT = 10

const format = (text: string) => text.replace(/\s\s+/g, ' ').split('Share This Post')[0].trim()
const formatDocs = (docs: Document[]) => {
  return docs.map((doc) => {
    doc.pageContent = format(doc.pageContent)
    return doc
  })
}

const smd = JSON.parse(JSON.stringify(sitemapDocs))
let docs: Document[] = smd.length > 0 ? formatDocs(smd) : []
async function getDocs(writeFile = false) {
  if (!docs || docs.length === 0 || !Array.isArray(docs)) {
    const loader = new SitemapLoader(sitemapUrl, {
      selector: '.article-content', //extract article content only,
    })

    docs = await loader.load()
    docs = formatDocs(docs)

    if (writeFile) fs.writeFileSync('src/assets/sitemap_docs.json', JSON.stringify(docs, null, 2))
    loggy(`[sitemap] loaded sitemap`)
  }
}

export async function populate(useSupabase = false, writeFile = false) {
  // try to get docs from supabase first
  const existingDocs = (await supabase.from('documents').select('*')).data || []
  if (useSupabase && existingDocs.length > 0) {
    docs = formatDocs(existingDocs)
    loggy(`[populate] retrieved documents from supabase`)
  } else {
    await getDocs(writeFile)
  }
}

export const vector = async (question: string, isAnthropic = false) => {
  loggy(`[vector] searching "${question}"`)
  const vectorLimit = isAnthropic ? ANTHROPIC_LIMIT : OPEN_AI_LIMIT

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
      .slice(0, vectorLimit * 2)

    // fallback filter for fuzzy search
    const qArray = question.split(' ').filter((v) => v.length > 2)
    const d2 = docs
      .filter((d: any) => d.pageContent && d.metadata)
      .filter((d: any) =>
        qArray.some(
          (v) =>
            d.metadata.title?.indexOf(v) >= 1 ||
            d.metadata.description?.indexOf(v) >= 1 ||
            d.pageContent.indexOf(v) >= 1,
        ),
      )
      .map((d: any) => {
        const count = qArray.filter(
          (v) =>
            d.metadata.title?.indexOf(v) >= 1 ||
            d.metadata.description?.indexOf(v) >= 1 ||
            d.pageContent.indexOf(v) >= 1,
        )

        return {
          ...d,
          score: count.length / 10,
          metadata: {
            ...d.metadata,
          },
        }
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, vectorLimit * 2)

    // merge results
    var seen: any = {}
    const mergedResults = [...d, ...d2]
      .sort((a: any, b: any) => b.score - a.score)
      .filter(function (item) {
        var k = item.metadata.url || item.pageContent
        return seen.hasOwnProperty(k) ? false : (seen[k] = true)
      })
      .slice(0, vectorLimit)

    // anthropic doesn't have it's own text embedding model
    // so we'll just use fuzzysort directly
    if (isAnthropic) {
      loggy(`[vector] isAnthropic - skip vector & use fuzzysort directly`)
      return mergedResults
    } else {
      const hnsw = await HNSWLib.fromDocuments(
        mergedResults,
        new OpenAIEmbeddings({
          model: 'text-embedding-3-large',
        }),
      )
      loggy(`[vector] fed vector store`)

      const results = await hnsw.similaritySearch(question, vectorLimit)
      loggy(`[vector] queried the vector store`)

      return results
    }
  }

  loggy(`[vector] no documents found`)
  return []
}

// -----------
// RAG – WORK IN PROGRESS
// The question is: how to feed it all the 420+ entries?
// Need better API key? More context window
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
