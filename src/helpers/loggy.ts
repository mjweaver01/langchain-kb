import chalk from 'chalk'

export const loggy = (text: string, error: boolean = false, cache?: boolean) => {
  console.log(error ? chalk.red(text) : cache ? chalk.blue(text) : chalk.green(text))
}

export default loggy
