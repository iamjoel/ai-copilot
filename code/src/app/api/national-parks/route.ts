import { getModel } from "@/lib/model-factory";
import {
  computeGeminiFlashLiteCost,
  computeUsageDetail,
} from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing prompt." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const textResponse = await generateText({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      prompt,
      maxRetries: 1,
      tools: {
        url_context: google.tools.urlContext({}),
      },
    });

    const textUsage = computeUsageDetail(textResponse.totalUsage ?? textResponse.usage);
    const textCost = computeGeminiFlashLiteCost(textUsage);
    const rawGrounding = textResponse.providerMetadata?.google?.groundingMetadata;
    const groundingMetadata = rawGrounding as unknown
      ? {
        urls: Array.isArray(rawGrounding.groundingChunks)
          ? rawGrounding.groundingChunks
            .map((chunk: unknown) => (chunk as { retrievedContext?: { uri?: string } })?.retrievedContext?.uri)
            .filter((uri): uri is string => typeof uri === "string")
          : [],
        support: Array.isArray(rawGrounding.groundingSupports)
          ? rawGrounding.groundingSupports.map((item: unknown) => {
            const support = item as {
              confidenceScores?: unknown;
              segment?: { text?: string };
              groundingChunkIndices?: number[];
            };

            const cs = support.confidenceScores;
            const confidenceScores =
              typeof cs === "number"
                ? cs
                : (Array.isArray(cs) ? cs[0] : undefined);

            const urlIndex = Array.isArray(support.groundingChunkIndices)
              ? support.groundingChunkIndices[0]
              : undefined;

            return {
              text: support.segment?.text,
              urlIndex,
              confidenceScores,
            };
          })
          : [],
      }
      : undefined;

    const resJSONSchema = z.object({
      establishedYear: z
        .number()
        .describe("Year the park was established; Use four digits format. Return -1 if the text does not contain it."),
    });

    type ParkDetails = z.infer<typeof resJSONSchema>;

    const jsonResponse = await generateObject<ParkDetails>({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      schema: resJSONSchema,
      prompt:
        `You will receive text about a national park. Using only that text (do not browse the web), ` +
        `return a JSON object that captures the park's details.\n\n` +
        `Text:\n${textResponse.text ?? ""}`,
      maxRetries: 1,
    });

    const jsonResult = jsonResponse.object as { establishedYear: number }
    const jsonUsage = computeUsageDetail(jsonResponse.usage);
    const jsonCost = computeGeminiFlashLiteCost(jsonUsage);

    return new Response(
      JSON.stringify({
        text: textResponse.text,
        json: jsonResult,
        textUsage,
        jsonUsage,
        textCost,
        jsonCost,
        rawGrounding,
        groundingMetadata,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("National parks endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to extract park info right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
