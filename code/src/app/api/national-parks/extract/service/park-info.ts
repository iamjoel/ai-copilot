/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetail } from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type GroundingSupport = {
  text?: string;
  urlIndex?: number;
  confidenceScores?: number;
};

export type GroundingMetadata = {
  urls: string[];
  support: GroundingSupport[];
};

export type ExtractionResult = {
  text: string;
  textUsage: ReturnType<typeof computeUsageDetail>;
  textCost: ReturnType<typeof computeGeminiFlashLiteCost>;
  rawGrounding: unknown;
  groundingMetadata?: GroundingMetadata;
  textDurationSec: number;
};

export async function extractParkText(parkName: string, wikiUrl: string): Promise<ExtractionResult> {
  const prompt = `You are a data extraction assistant.

Your ONLY knowledge sources are the contents returned by the url_context tool.
Treat anything outside the tool output as UNKNOWN.

Document URL:
- ${wikiUrl}

Goal:
Identify how this page specifies key details about "${parkName}".

Instructions:
1. Use the url_context tool to read the page.
2. Search for any part of the page that explicitly mentions:
  1 The official website. 
  2 Whether it is a World Heritage site. 
  3 Total number of species.
  4 Number of endangered species recorded in the IUCN Red List.
  5 Forest coverage percentage.
  6 The park's total area (prefer km²; include the source unit if different).
  7 When the park was established (an "Established" year).
  8 Whether it is a World Heritage site or a Biosphere Reserve.
  9 Annual visitors (convert to units of ten-thousands of people as an integer if needed).

Output format(strict):
For each of the nine keys, output a section with: <A one-sentence summary. If not found, say not specify>

If is found, also include:
  Evidence: <verbatim text copied from the page>

For example:
\`\`\`
1. Official website: The official website is www.examplepark.org.
Evidence: Official website: www.examplepark.org

2. World Heritage site: Not specify.
\`\`\`

Sections must appear in this exact order:

1. Official website:
2. World Heritage site:
3. Species count:
4. Endangered species:
5. Forest coverage:
6. Area:
7. Established year:
8. International certification:
9. Annual visitors:

Rules:
- "Summary" must be a short neutral rewrite of the content (1 sentence max).
- "Evidence" must be a verbatim excerpt from the webpage (up to 4 short lines).
- Do NOT add any extra text, titles, commentary, or reasoning.
- Do NOT change the key names or the order.
- There should be a blank line between sections.

Hard constraints:
- Do NOT guess or infer any values.
- Do NOT use common knowledge or training data.
- Base your answer strictly on the text returned by url_context (including any Google pages you load).`;

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
    throw new Error("Missing text response from model.");
  }
  const textDurationSec = Number(((Date.now() - textStart) / 1000).toFixed(1));

  const textUsage = computeUsageDetail(textResponse.totalUsage ?? textResponse.usage);
  const textCost = computeGeminiFlashLiteCost(textUsage);
  const rawGrounding: any = textResponse.providerMetadata?.google?.groundingMetadata;
  const groundingMetadata = rawGrounding
    ? {
      urls: Array.isArray(rawGrounding.groundingChunks)
        ? rawGrounding.groundingChunks
          .map((chunk: unknown) => (chunk as any)?.retrievedContext?.uri || (chunk as any)?.web?.uri)
          .filter((uri: string) => typeof uri === "string")
        : [],
      support: Array.isArray(rawGrounding.groundingSupports)
        ? rawGrounding.groundingSupports.filter((item: any) => !!item.segment?.text).map((item: unknown) => {
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

  return {
    text: textResponse.text,
    textUsage,
    textCost,
    rawGrounding,
    groundingMetadata,
    textDurationSec,
  };
}
