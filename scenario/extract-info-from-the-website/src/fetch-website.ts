import 'dotenv/config';
import { createGoogleGenerativeAI, google, GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { generateText } from 'ai';

const googleApiKey = process.env.GOOGLE_API_KEY
const gemini = createGoogleGenerativeAI({ apiKey: googleApiKey! });
const { text, sources, providerMetadata } = await generateText({
  model: gemini('gemini-2.5-flash'),
  prompt: `Based on the document: https://en.wikipedia.org/wiki/Hawf_National_Reserve
          Which year did the park get established? If find the answer, provide the original sentence or paragraph as well.`,
  tools: {
    url_context: google.tools.urlContext({}),
  },
});

const metadata = providerMetadata?.google as
  | GoogleGenerativeAIProviderMetadata
  | undefined;
const groundingMetadata = metadata?.groundingMetadata;
const urlContextMetadata = metadata?.urlContextMetadata;

console.log('Generated Text:', text);
console.log('------------')
console.log('Sources:', JSON.stringify(groundingMetadata?.groundingSupports));
// console.log('------------')
// console.log('URL Context Metadata:', urlContextMetadata);
// console.log('------------')
// console.log(sources)
