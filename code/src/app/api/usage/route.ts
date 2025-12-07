import { getModel } from "@/lib/model-factory";
import {
  computeGeminiFlashLiteCost,
  computeUsageDetail,
} from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
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
        google_search: google.tools.googleSearch({}),
      },
    });

    const responseTimeMs = Date.now() - startedAt;
    const usage = result.totalUsage ?? result.usage;
    const usageDetail = computeUsageDetail(usage);
    const costDetail = computeGeminiFlashLiteCost(usageDetail);

    return new Response(
      JSON.stringify({
        text: result.text,
        responseTimeMs,
        usage: usageDetail,
        cost: costDetail,
        groundingMetadata: result.providerMetadata?.google?.groundingMetadata,
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
