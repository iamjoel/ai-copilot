import "@/lib/add-proxy";
import { gemini25FlashLiteModel } from "@/lib/model-factory";
import { listDirectoryTool } from "@/lib/tools/list-directory";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = streamText({
    model: gemini25FlashLiteModel,
    system:
      "You are a helpful assistant that keeps replies concise and friendly. " +
      "When the user asks about files or folders, inspect the repository by calling the list_directory tool with a relative path (default to '.' for the workspace root).",
    messages: await convertToModelMessages(messages),
    tools: {
      list_directory: listDirectoryTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
