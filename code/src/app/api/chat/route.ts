import "@/lib/add-proxy";
import { getModel } from "@/lib/model-factory";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = await streamText({
    model: getModel("openai", "gpt-4o-mini"),
    system:
      "You are a helpful assistant that keeps replies concise and friendly.",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
