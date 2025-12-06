import { createOpenAI } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Missing OPENAI_API_KEY. Add it to your environment to enable chat.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a helpful assistant that keeps replies concise and friendly.",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
