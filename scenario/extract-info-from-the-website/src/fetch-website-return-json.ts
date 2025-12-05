import 'dotenv/config';
import { createGoogleGenerativeAI, google, GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { generateObject, generateText, Output } from 'ai';
import { z } from 'zod'
const googleApiKey = process.env.GOOGLE_API_KEY
const gemini = createGoogleGenerativeAI({ apiKey: googleApiKey! });
const prompt = `You are an expert in extracting structured information from unstructured text.

Only use the content from the given webpage. Do not rely on common knowledge, memory, or any other external sources.

Document: https://en.wikipedia.org/wiki/Hawf_National_Reserve

Task:
Extract the year when the park was established (“Established” year).

Requirements:
- Return a single four-digit year.
- If the webpage does not explicitly provide an establishment year, return -1.
- Do not guess or infer information that is not directly stated in the document.
`

// generateObject don't support tools yet.experimental_output also not work: url_context tool don't support return json...
const { providerMetadata, text } = await generateText({
  model: gemini('gemini-2.5-flash'),
  prompt,
  tools: {
    url_context: google.tools.urlContext({}),
  },
});

// extract json from text
const { object } = await generateObject({
  model: gemini('gemini-2.5-flash'),
  prompt: `You are an expert in extracting structured information from unstructured text.Do not rely on common knowledge, memory, or any other external sources. Text: ${text}`,
  schema: z.object({
    establishedYear: z.number().describe('The year when the park was established. Return -1 if not found.'),
  }),
});

console.log(text)
console.log('------------')
console.log(`year: ${object.establishedYear}`)
console.log('------------')
console.log(providerMetadata?.google?.groundingMetadata ? JSON.stringify(providerMetadata.google.groundingMetadata, null, 2) : 'No grounding metadata')
