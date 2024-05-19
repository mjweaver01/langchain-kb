import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Request, Response } from 'express'
import handler from '../src/helpers/handler'

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  try {
    const answer = await handler(
      req as Request & VercelRequest,
      res as Response & VercelResponse,
      'kb',
    )

    res.status(200).json({
      body: answer,
      query: req.query,
    })
  } catch (e) {
    // If it's not an Error object, handle it as a generic error
    res.status(500).json(e)
  }
}
