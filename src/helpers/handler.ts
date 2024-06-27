import { Request, Response } from 'express'
import { getCache, saveToCache, getConversation } from './cache'
import { askQuestion } from './ask'
import loggy from './loggy'

export const handler = async (req: Request, res: Response, context: SourceType) => {
  const conversationId = req.body?.conversationId?.toString().trim() ?? null
  const url = req.body?.url?.trim() ?? null
  const data = req.body?.data ?? null
  let input = req.body?.question?.trim() ?? null
  const nocache = req.body?.nocache ?? req.query?.nocache === 'true' ?? false
  const model = req.body?.model ?? req.query?.model ?? 'openai'

  loggy(`[${context}] ${input?.toString().substring(0, 50) ?? 'hit handler'}`, false)

  const currentTime = Date.now()

  if (context === 'conversation') {
    const conversation = await getConversation(conversationId)

    if (!conversationId || conversationId.length <= 0 || !conversation) {
      return res.json({
        code: 404,
        message: 'Conversation not found',
        error: true,
      })
    }

    return res.json({
      code: 200,
      message: 'Conversation found',
      conversation: conversation,
    })
  }

  if (input?.length <= 0 && url?.length <= 0 && data?.length <= 0)
    return res.json({
      code: 403,
      message: 'Please provide a question, data, or a url to fetch',
      error: true,
    })

  if (!nocache) {
    const cachedData = await getCache(context, currentTime, model, input)
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
    const answer = await askQuestion(input, context, conversationId, model)
    saveToCache(context, currentTime, input, answer, model)

    return res.json({
      answer: answer ?? 42,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).send(e)
  }
}

export default handler
