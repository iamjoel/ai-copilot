import 'dotenv/config';
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import '../utils/add-proxy';

const openaiApiKey = process.env.OPENAI_API_KEY;

async function main() {
  const openai = createOpenAI({ apiKey: openaiApiKey })

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: "Say hello world",
    maxRetries: 1,
  })
  console.log(text);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
