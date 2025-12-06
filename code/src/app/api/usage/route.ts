import { getModel } from "@/lib/model-factory";
import { google } from '@ai-sdk/google';
import { generateText } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

export async function POST(req: Request) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const startedAt = Date.now();

    const result = await generateText({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      prompt,
      maxRetries: 1,
      tools: {
        url_context: google.tools.urlContext({}),
      },
    });

    const responseTimeMs = Date.now() - startedAt;
    const usage = result.totalUsage ?? result.usage;
    const usageWithTokens = usage as
      | {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        inputTokens?: number;
        outputTokens?: number;
      }
      | undefined;

    const usageDetail = usageWithTokens
      ? {
        inputTokens: usageWithTokens.promptTokens ?? usageWithTokens.inputTokens,
        outputTokens:
          usageWithTokens.completionTokens ?? usageWithTokens.outputTokens,
        totalTokens: usageWithTokens.totalTokens,
        raw: usageWithTokens,
      }
      : undefined;

    return new Response(
      JSON.stringify({
        text: result.text,
        responseTimeMs,
        usage: usageDetail,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Usage endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to fetch usage right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
