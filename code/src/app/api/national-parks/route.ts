import { getModel } from "@/lib/model-factory";
import {
  computeGeminiFlashLiteCost,
  computeUsageDetail,
} from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import test from "node:test";
import { unknown, z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { parkName, wikiUrl } = (await req.json()) as { parkName?: string; wikiUrl?: string };
    const name = parkName?.trim();
    const url = wikiUrl?.trim();

    if (!name || !url) {
      return new Response(
        JSON.stringify({ error: "Missing parkName or wikiUrl." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const prompt = `You are a data extraction assistant.

Your ONLY knowledge source is the content of the webpage loaded via the url_context tool.
Treat anything outside the tool output as UNKNOWN.

Document URL:
- ${url}

Goal:
Identify how this page specifies when the park "${name}" was established (the "Established" year).

Instructions:
1. Use the url_context tool to read the page.
2. Search for any part of the page that explicitly mentions when the park was established
  (for example, an infobox row named "Established" or a sentence stating the year).
3. If you find such information, copy the minimal surrounding text VERBATIM from the page:
  - Prefer the table row or sentence that contains the date.
  - Include at most 3 short lines or 1–2 sentences.
4. If the page does NOT explicitly state an establishment year, respond exactly with:
  NO_ESTABLISHED_YEAR_FOUND

Output format:
- If found: only output the verbatim excerpt from the page, no extra explanation.
- If not found: only output "NO_ESTABLISHED_YEAR_FOUND".

Hard constraints:
- Do NOT guess or infer any dates.
- Do NOT use common knowledge, training data, or other websites.
- Base your answer strictly on the text returned by url_context.`;

    const textStart = Date.now();
    const textResponse = await generateText({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      prompt,
      maxRetries: 1,
      tools: {
        url_context: google.tools.urlContext({}),
      },
    });

    if (!textResponse.text) {
      return new Response(
        JSON.stringify({ error: "Missing text response from model." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const textDurationSec = Number(((Date.now() - textStart) / 1000).toFixed(1));

    const textUsage = computeUsageDetail(textResponse.totalUsage ?? textResponse.usage);
    const textCost = computeGeminiFlashLiteCost(textUsage);
    const rawGrounding = textResponse.providerMetadata?.google?.groundingMetadata;
    const groundingMetadata = rawGrounding as unknown
      ? {
        urls: Array.isArray(rawGrounding.groundingChunks)
          ? rawGrounding.groundingChunks
            .map((chunk: unknown) => (chunk as any)?.retrievedContext?.uri || (chunk as any)?.web?.uri)
            .filter((uri): uri is string => typeof uri === "string")
          : [],
        support: Array.isArray(rawGrounding.groundingSupports)
          ? rawGrounding.groundingSupports.filter(item => !!item.segment?.text).map((item: unknown) => {
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

    const jsonStart = Date.now();
    const jsonResponse = await generateObject<ParkDetails>({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      schema: resJSONSchema,
      prompt:
        `You will receive text about a national park. Using only that text (do not browse the web), ` +
        `return a JSON object that captures the park's details.\n\n` +
        `Text:\n${textResponse.text ?? ""}`,
      maxRetries: 1,
    });
    const jsonDurationSec = Number(((Date.now() - jsonStart) / 1000).toFixed(1));

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
        textDurationSec,
        jsonDurationSec,
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
