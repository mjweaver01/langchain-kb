import express, { Request, Response } from 'express'
import * as dotenv from 'dotenv'
import chalk from 'chalk'
import loggy from './helpers/loggy'
import handler from './helpers/handler'
import crons from './helpers/crons'

// -----------------------
// data
// -----------------------
dotenv.config()
const { NODE_ENV } = process.env
const isProd = NODE_ENV === 'production'
const appName = chalk.hex('#1877f2')('[🦜] ')

// -----------------------
// express app
// -----------------------
const app = express()
const port = isProd ? 80 : 9179
app.use(express.json())

// -----------------------
// routes
// -----------------------
app.post('/ask-gpt', (req: Request, res: Response) => handler(req, res, 'gpt'))
app.post('/get-gist', (req: Request, res: Response) => handler(req, res, 'gist'))
app.post('/get-status', (req: Request, res: Response) => handler(req, res, 'status'))

// -----------------------
// static
// -----------------------
app.use(express.static('public', { extensions: ['html'] }))

// -----------------------
// CRONS
// -----------------------
crons()

// -----------------------
// start listening
// -----------------------
app.listen(port, () =>
  loggy(appName + (isProd ? `Listening on port ${port}` : `Listening on http://localhost:${port}`)),
)
