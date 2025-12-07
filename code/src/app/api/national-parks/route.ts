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
Identify how this page specifies key details about "${name}".

Instructions:
1. Use the url_context tool to read the page.
2. Search for any part of the page that explicitly mentions:
  1 The official website. If not found, respond with NO_OFFICIAL_WEBSITE_FOUND
  2 Whether it is a World Heritage site. If not found, respond with NOT_A_WORLD_HERITAGE_SITE
  3 Total number of species. If not found, respond with NO_SPECIES_COUNT_FOUND
  4 Number of endangered species recorded in the IUCN Red List. If not found, respond with NO_ENDANGERED_SPECIES_FOUND
  5 Forest coverage percentage. If not found, respond with NO_FOREST_COVERAGE_FOUND
  6 The park's total area (prefer km²; include the source unit if different). If not found, respond with NO_PARK_TOTAL_AREA_FOUND
  7 When the park was established (an "Established" year). If not found, respond with NO_ESTABLISHED_YEAR_FOUND
  8 Whether it is a World Heritage site or a Biosphere Reserve. If not found, respond with NO_INTL_CERT_FOUND
  9 Annual visitors (convert to units of ten-thousands of people as an integer if needed). If not found, respond with NO_ANNUAL_VISITORS_FOUND
3. Copy the minimal surrounding text VERBATIM from the page for each item you find:
  - Prefer concise rows/sentences (infobox rows, short sentences).
  - Include at most 4 short lines or 1–2 sentences per item.

Output format:
- Provide a short section for each item (Official website, World Heritage site, Species count, Endangered species, Forest coverage, Area, Established year, International certification, Annual visitors).
- For each section, include the verbatim excerpt or the corresponding NO_* message.

Hard constraints:
- Do NOT guess or infer any values.
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
      officialWebsite: z
        .string()
        .describe("Official website URL of the park. Return an empty string if not found."),
      // Ecological Integrity
      level: z
        .number()
        .describe("Level of the park: 2 if it is a World Heritage site, otherwise 1."),
      speciesCount: z
        .number()
        .describe("Total number of species in the park. Return -1 if not stated."),
      endangeredSpecies: z
        .number()
        .describe("Count of endangered species listed in the IUCN Red List. Return -1 if not stated."),
      forestCoverage: z
        .number()
        .describe("Forest coverage percentage with one decimal place (e.g., 95.9). Return -1 if not stated."),
      // Governance Resilience
      area: z
        .number()
        .describe("Total area of the park in square kilometers. Convert to km² if another unit is provided. Return -1 if missing."),
      establishedYear: z
        .number()
        .describe("Year the park was established; Use four digits format. Return -1 if the text does not contain it."),
      internationalCert: z
        .number()
        .describe("International certification flag: 1 if the park is a World Heritage site or a Biosphere Reserve, otherwise 0."),
      // Nature Immersion
      annualVisitors: z
        .number()
        .describe(
          "Annual visitors expressed as an integer count of ten-thousands of people. Convert from other units if needed, round to the nearest whole ten-thousand, otherwise return -1."
        ),
    });

    type ParkDetails = z.infer<typeof resJSONSchema>;

    const jsonStart = Date.now();
    const jsonResponse = await generateObject<ParkDetails>({
      model: getModel("google", "models/gemini-2.5-flash-lite"),
      schema: resJSONSchema,
      prompt:
        `You will receive text about a national park. Using only that text (do not browse the web), ` +
        `return a JSON object that captures the park's details. If a field is not explicitly present, follow the fallback rule from its description. ` +
        `Normalize units: area -> square kilometers; forestCoverage -> percentage with one decimal place; annualVisitors -> convert to an integer count of ten-thousands of people (round to nearest) if another unit is provided.\n\n` +
        `Text:\n${textResponse.text ?? ""}`,
      maxRetries: 1,
    });
    const jsonDurationSec = Number(((Date.now() - jsonStart) / 1000).toFixed(1));

    const jsonResult = jsonResponse.object as {
      establishedYear: number;
      officialWebsite: string;
      area: number;
      internationalCert: number;
      level: number;
      speciesCount: number;
      endangeredSpecies: number;
      forestCoverage: number;
      annualVisitors: number;
    }
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
