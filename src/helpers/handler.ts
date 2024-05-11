import { Request, Response } from 'express'
import { getCache, saveToCache } from './cache'
import loggy from './loggy'

export const handler = async (req: Request, res: Response, context: SourceType) => {
  const conversationId = req.body?.conversationId?.toString().trim() ?? null
  const url = req.body?.url?.trim() ?? null
  const data = req.body?.data ?? null
  let input = req.body?.question?.trim() ?? null
  const nocache = req.body?.nocache ?? req.query?.nocache === 'true' ?? false

  loggy(`[${context}] ${input?.toString().substring(0, 50) ?? 'hit handler'}`, false)

  const currentTime = Date.now()

  if (input?.length <= 0 && url?.length <= 0 && data?.length <= 0)
    return res.json({
      code: 403,
      message: 'Please provide a question, data, or a url to fetch',
      error: true,
    })

  if (!nocache) {
    const cachedData = await getCache(context, currentTime, input)
    const latestCacheHit = cachedData?.[0]

    if (latestCacheHit && latestCacheHit.answer) {
      loggy(`[${context}] cache hit`, false, true)
      return res.json({
        ...latestCacheHit,
        isCached: true,
      })
    }
  }

  if (url) {
    try {
      input = await fetch(url).then((res) => res.text())
    } catch (e) {
      console.error(e)
      return res.status(500).send(e)
    }
  } else if (data?.length > 0) {
    input = JSON.stringify(data)
  }

  try {
    const answer = await askQuestion(input, context, conversationId)
    saveToCache(context, currentTime, input, answer)

    return res.json({
      answer: answer ?? 42,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).send(e)
  }
}

export default handler
