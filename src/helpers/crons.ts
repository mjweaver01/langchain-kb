import { FIVE_MINUTES, defaultQuestion } from './constants'
import { askQuestion } from './ask'
import { saveToCache } from './cache'
import { getStatus } from './status'
import loggy from './loggy'

export const crons = () => {
  // status
  setInterval(async () => {
    const question = await getStatus().then((res) => JSON.stringify(res))
    const answer = await askQuestion(question, 'status')
    await saveToCache('status', Date.now(), question, answer)
    loggy('[cron] TW status cached')
  }, FIVE_MINUTES)
}

export default crons
