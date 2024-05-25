import express, { Request, Response } from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import chalk from 'chalk'
import loggy from './helpers/loggy'
import handler from './helpers/handler'
import crons from './helpers/crons'
import { populate } from './helpers/vector'

// -----------------------
// data
// -----------------------
dotenv.config()
const { NODE_ENV } = process.env
const isProd = NODE_ENV === 'production'
const appName = chalk.hex('#1877f2')('[🦜🔗] ')

// -----------------------
// express app
// -----------------------
const app = express()
const port = isProd ? 80 : 9179
app.use(express.json())

// -----------------------
// cors
// -----------------------
app.use(cors())

// -----------------------
// kb routes
// -----------------------
app.post('/ask-kb', (req: Request, res: Response) => handler(req, res, 'kb'))
app.post('/populate-kb', async (req: Request, res: Response) => {
  await populate(false, true)
  res.send('done')
})

// -----------------------
// chat routes
// -----------------------
app.post('/ask-gpt', (req: Request, res: Response) => handler(req, res, 'gpt'))
app.post('/get-gist', (req: Request, res: Response) => handler(req, res, 'gist'))
app.post('/get-conversation', (req: Request, res: Response) => handler(req, res, 'conversation'))

// -----------------------
// static
// -----------------------
app.use(express.static('public', { extensions: ['html'] }))

// -----------------------
// CRONS
// -----------------------
crons()

// -----------------------
// ping / keepalive
// -----------------------
app.get('/resuscitate', (req: Request, res: Response) => {
  loggy(appName + 'resuscitate')
  res.send('breathing')
})

// -----------------------
// start listening
// -----------------------
app.listen(port, () =>
  loggy(appName + (isProd ? `Listening on port ${port}` : `Listening on http://localhost:${port}`)),
)
