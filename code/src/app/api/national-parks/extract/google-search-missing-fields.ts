/* eslint-disable @typescript-eslint/no-explicit-any */
import { gemini25FlashLiteModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetailsSum, UsageDetail } from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { ParkDetailSources, ParkDetails } from "./transform-park-text";
import fields, { getFieldSchema } from "./fields";

export type NonSourceKey = Exclude<keyof ParkDetails, keyof ParkDetailSources>;

export type GoogleSearchFieldResult = {
  field: NonSourceKey;
  value: Record<NonSourceKey, string | number>;
  usage?: UsageDetail;
  cost?: ReturnType<typeof computeGeminiFlashLiteCost>;
  durationSec: number;
};

const FIELD_ORDER: NonSourceKey[] = [
  // "officialWebsite", // officialWebsite not necessary
  "level",
  "speciesCount",
  "endangeredSpecies",
  "forestCoverage",
  "area",
  "establishedYear",
  "internationalCert",
  "annualVisitors",
];

export function findFieldsNeedingGoogleSearch(jsonResult: ParkDetails): NonSourceKey[] {
  const missing = FIELD_ORDER.filter((field) => {
    const value = jsonResult[field];
    return value === -1 || value === "";
  });
  return missing;
}


function buildPrompt(parkName: string, field: NonSourceKey) {
  const prompt = `You are a data extraction assistant.
You are filling one missing field for the national park "${parkName}".
The missing field: ${fields[field]}.
Your goal is to find the most reliable, up-to-date value for this field using Google search.

Output format(strict):
${field}: <A one-sentence summary. If not found, say not specify>

If is found, also include:
  Evidence: <verbatim text copied from the page>

For example:
\`\`\`

Official website: The official website is www.examplepark.org.
Evidence: Official website: www.examplepark.org

2. World Heritage site: Not specify.
\`\`\`
`
  return prompt;
}

export function sumUsageTotals(usages: (UsageDetail | undefined)[]): UsageDetail | undefined {
  const totals = { inputTokens: 0, outputTokens: 0, totalTokens: 0, urlTokens: 0 };
  let hasUsage = false;

  for (const usage of usages) {
    if (!usage) continue;
    if (typeof usage.inputTokens === "number") {
      totals.inputTokens += usage.inputTokens;
      hasUsage = true;
    }
    if (typeof usage.outputTokens === "number") {
      totals.outputTokens += usage.outputTokens;
      hasUsage = true;
    }
    if (typeof usage.totalTokens === "number") {
      totals.totalTokens += usage.totalTokens;
      hasUsage = true;
    }
    if (typeof usage.urlTokens === "number") {
      totals.urlTokens += usage.urlTokens;
      hasUsage = true;
    }
  }

  if (!hasUsage) return undefined;

  return {
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    totalTokens: totals.totalTokens,
    urlTokens: totals.urlTokens,
    raw: undefined,
  };
}

async function searchFieldWithGoogle({
  parkName,
  field,
}: {
  parkName: string;
  field: NonSourceKey;
}): Promise<GoogleSearchFieldResult> {
  const searchStartedAt = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await generateText<any>({
    model: gemini25FlashLiteModel,
    prompt: buildPrompt(parkName, field),
    // schema,
    maxRetries: 1,
    tools: {
      google_search: google.tools.googleSearch({}),
      url_context: google.tools.urlContext({}),
    },
  });

  console.log(response)

  const durationSec = Number(((Date.now() - searchStartedAt) / 1000).toFixed(1));

  const jsonResponse = await generateObject<any>({
    model: gemini25FlashLiteModel,
    schema: getFieldSchema(field),
    prompt:
      `You will receive text about a national park. Using only that text (do not browse the web), ` +
      `return a JSON object that captures the park's details. If a field is not explicitly present, follow the fallback rule from its description. ` +
      `For the field, also return the corresponding "...Source" string with the verbatim evidence text (everything after "Evidence:") or an empty string if not found. Preserve line breaks in evidence.\n\n` +
      `Text:\n${response.text ?? ""}`,
    maxRetries: 1,
  })

  const usage = computeUsageDetailsSum([response.usage, jsonResponse.usage]);
  const cost = computeGeminiFlashLiteCost(usage);

  return {
    field,
    value: jsonResponse.object.value as Record<NonSourceKey, string | number>,
    usage,
    cost,
    durationSec,
  };
}

export async function searchMissingFieldWithGoogle({
  parkName,
  field,
}: {
  parkName: string;
  field: NonSourceKey;
}): Promise<GoogleSearchFieldResult> {
  return searchFieldWithGoogle({ parkName, field });
}
