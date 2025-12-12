/* eslint-disable @typescript-eslint/no-explicit-any */
import { gemini25FlashLiteModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetailsSum, UsageDetail } from "@/lib/usage-utils";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import fields, { getFieldSchema, ParkDetail } from "../fields";
import { FieldsType } from "../fields";

export type GoogleSearchFieldResult = {
  field: FieldsType;
  value: Record<FieldsType, string | number>;
  usage?: UsageDetail;
  cost?: ReturnType<typeof computeGeminiFlashLiteCost>;
  durationSec: number;
  textWithContext?: string;
};

const FIELD_ORDER: FieldsType[] = [
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

export function findFieldsNeedingGoogleSearch(jsonResult: ParkDetail): FieldsType[] {
  const missing = FIELD_ORDER.filter((field) => {
    const value = jsonResult[field];
    return value === -1 || value === "";
  });
  return missing;
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
  field: FieldsType;
}): Promise<GoogleSearchFieldResult> {
  const searchStartedAt = Date.now();
  const response = await generateText<any>({
    model: gemini25FlashLiteModel,
    prompt: `
You are a data extraction assistant.

You are filling one missing field for the national park "${parkName}".
The missing field name is "${field}", and here is its field description:
${fields[field]}

Your goal is to find the most reliable, up-to-date value for this field using Google search.

Formatting rules (STRICT):
- You MUST output **exactly three lines**, nothing more.
- Line 1 MUST start with: ${field}:
- Line 2 MUST start with: SourceText:
- Line 3 MUST start with: SourceURL:
- Do NOT add any explanation, comments, or extra text.
- Do NOT wrap the answer in quotes or code blocks.
- Do NOT output any text before or after these three lines.

If the value IS found, use this exact format:
${field}: <a one-sentence summary of the value. If multiple numbers are given for different groups (e.g. mammals, birds, fish, amphibians, reptiles, plants), sum them up and give the total species count here.>
SourceText: <verbatim text copied from the page>
SourceURL: <url of the page>

If the value is NOT found, use this exact format:
${field}: not specify
SourceText:
SourceURL:

Now produce your answer following the rules above.`,
    maxRetries: 1,
    tools: {
      google_search: google.tools.googleSearch({}),
      url_context: google.tools.urlContext({}),
    },
  });

  const textWithContext = response.text;


  const jsonResponse = await generateObject<any>({
    model: gemini25FlashLiteModel,
    schema: getFieldSchema(field),
    prompt: `
You will receive text about a national park. Using only that text (do not browse the web), 
For the field, also return the corresponding "...SourceText" string with the verbatim evidence text (everything after "SourceText:") and "...SourceUrl" (everything after "SourceURL:") or an empty string if not found. Preserve line breaks in evidence.
Text:\n${textWithContext ?? ""}`,
    maxRetries: 1,
  })

  const usage = computeUsageDetailsSum([response.usage, jsonResponse.usage]);
  const cost = computeGeminiFlashLiteCost(usage);
  const jsonResult = jsonResponse.object

  const durationSec = Number(((Date.now() - searchStartedAt) / 1000).toFixed(1));

  return {
    field,
    textWithContext,
    value: jsonResult as Record<FieldsType, string | number>,
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
  field: FieldsType;
}): Promise<GoogleSearchFieldResult> {
  return searchFieldWithGoogle({ parkName, field });
}
