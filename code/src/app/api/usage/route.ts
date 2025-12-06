import { getModel } from "@/lib/model-factory";
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
          urlTokens?: number;
        }
      | undefined;

    const inputTokens = usageWithTokens ? usageWithTokens.promptTokens ?? usageWithTokens.inputTokens : undefined;
    const outputTokens = usageWithTokens ? usageWithTokens.completionTokens ?? usageWithTokens.outputTokens : undefined;
    const totalTokens = usageWithTokens ? usageWithTokens.totalTokens : undefined;
    const urlTokens =
      usageWithTokens?.urlTokens ??
      (totalTokens ? totalTokens - ((inputTokens ?? 0) + (outputTokens ?? 0)) : undefined);
    const usageDetail = usageWithTokens
      ? {
          inputTokens,
          outputTokens,
          totalTokens,
          urlTokens,
          raw: usageWithTokens,
        }
      : undefined;

    const INPUT_RATE = 0.1 / 1_000_000; // USD per input/url token
    const OUTPUT_RATE = 0.4 / 1_000_000; // USD per output token
    const costDetail = usageDetail
      ? {
          input: (inputTokens ?? 0) * INPUT_RATE,
          output: (outputTokens ?? 0) * OUTPUT_RATE,
          url: (urlTokens ?? 0) * INPUT_RATE,
          total:
            (inputTokens ?? 0) * INPUT_RATE +
            (outputTokens ?? 0) * OUTPUT_RATE +
            (urlTokens ?? 0) * INPUT_RATE,
          ratePerToken: {
            input: INPUT_RATE,
            output: OUTPUT_RATE,
          },
        }
      : undefined;

    return new Response(
      JSON.stringify({
        text: result.text,
        responseTimeMs,
        usage: usageDetail,
        cost: costDetail,
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
