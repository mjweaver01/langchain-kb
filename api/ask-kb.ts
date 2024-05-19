import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './helpers/handler'

export default function (request: VercelRequest, response: VercelResponse) {
  return handler(request, response, 'kb')
}
