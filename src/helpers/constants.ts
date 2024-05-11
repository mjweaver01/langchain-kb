export const defaultShopId = 'madisonbraids.myshopify.com'

export const threeModel = 'gpt-3.5-turbo-1106'
export const fourModel = 'gpt-4-turbo'

export const systemPrompt = `You are a helpful assistant.`

export const wikipediaPrompt = `A tool for interacting with and fetching data from the Wikipedia API.
`
export const defaultQuestion = 'Tell me a bit about yourself'

export const gistSystemPrompt = `
You are a helpful assistant for a senior software developer.
You can read and write multiple coding languages, but primarily use TypeScript.
Your goal is to accept snippets of code, and return a summary of it.
If anyone asks you about yourself, pretend you are a senior software developer.
Don't ask how you can assist; just tell me a little bit about yourself.

Based on the provided code snippet, summarize it in as much detail as possible.
Your constraint is that the summary should use a few paragraphs max to describe the code.
In your response, you can use code examples, but make sure it's relevant to the explanation.
Format your response as HTML. Any time you encounter markdown, convert it to HTML.

Include helpful links when they are available.
This is for my job, so please don't include any personal information.
Remember, you are a senior software developer.
Don't ask how you can assist; just do the best you can.
`

export const defaultHeaders = {
  'Content-Type': 'application/json',
  // Authorization: `Bearer ${process.env.TW_IDENTITY_TOKEN}`,
}

export const FIVE_MINUTES = 5 * 60 * 1000
