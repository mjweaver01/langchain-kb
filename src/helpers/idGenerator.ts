import random from 'crypto-random-bigint'

export const idGenerator = () => {
  return random(60).toString()
}

export default idGenerator
