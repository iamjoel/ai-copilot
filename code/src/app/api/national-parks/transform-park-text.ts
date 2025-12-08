import { getModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetail } from "@/lib/usage-utils";
import { generateObject } from "ai";
import { z } from "zod";

export const parkDetailsSchema = z.object({
  officialWebsite: z
    .string()
    .describe("Official website URL of the park. Return an empty string if not found."),
  officialWebsiteSource: z
    .string()
    .describe("Evidence text for officialWebsite; empty string if not found."),
  // Ecological Integrity
  level: z
    .number()
    .describe("Level of the park: 2 if it is a World Heritage site, otherwise 1."),
  levelSource: z
    .string()
    .describe("Evidence text for level; empty string if not found."),
  speciesCount: z
    .number()
    .describe("Total number of species in the park. Return -1 if not stated."),
  speciesCountSource: z
    .string()
    .describe("Evidence text for speciesCount; empty string if not found."),
  endangeredSpecies: z
    .number()
    .describe("Count of endangered species listed in the IUCN Red List. Return -1 if not stated."),
  endangeredSpeciesSource: z
    .string()
    .describe("Evidence text for endangeredSpecies; empty string if not found."),
  forestCoverage: z
    .number()
    .describe("Forest coverage percentage with one decimal place (e.g., 95.9). Return -1 if not stated."),
  forestCoverageSource: z
    .string()
    .describe("Evidence text for forestCoverage; empty string if not found."),
  // Governance Resilience
  area: z
    .number()
    .describe("Total area of the park in square kilometers. Convert to km² if another unit is provided. Return -1 if missing."),
  areaSource: z
    .string()
    .describe("Evidence text for area; empty string if not found."),
  establishedYear: z
    .number()
    .describe("Year the park was established; Use four digits format. Return -1 if the text does not contain it."),
  establishedYearSource: z
    .string()
    .describe("Evidence text for establishedYear; empty string if not found."),
  internationalCert: z
    .number()
    .describe("International certification flag: 1 if the park is a World Heritage site or a Biosphere Reserve, otherwise 0."),
  internationalCertSource: z
    .string()
    .describe("Evidence text for internationalCert; empty string if not found."),
  // Nature Immersion
  annualVisitors: z
    .number()
    .describe(
      "Annual visitors expressed as an integer count of ten-thousands of people. Convert from other units if needed, round to the nearest whole ten-thousand, otherwise return -1."
    ),
  annualVisitorsSource: z
    .string()
    .describe("Evidence text for annualVisitors; empty string if not found."),
});

export type ParkDetails = z.infer<typeof parkDetailsSchema>;
export type ParkDetailSources = {
  officialWebsiteSource: string;
  levelSource: string;
  speciesCountSource: string;
  endangeredSpeciesSource: string;
  forestCoverageSource: string;
  areaSource: string;
  establishedYearSource: string;
  internationalCertSource: string;
  annualVisitorsSource: string;
};

export type TransformResult = {
  jsonResult: ParkDetails;
  jsonUsage: ReturnType<typeof computeUsageDetail>;
  jsonCost: ReturnType<typeof computeGeminiFlashLiteCost>;
  jsonDurationSec: number;
};

export async function transformParkTextToJson(text: string): Promise<TransformResult> {
  const jsonStart = Date.now();
  const jsonResponse = await generateObject<ParkDetails>({
    model: getModel("google", "models/gemini-2.5-flash-lite"),
    schema: parkDetailsSchema,
    prompt:
      `You will receive text about a national park. Using only that text (do not browse the web), ` +
      `return a JSON object that captures the park's details. If a field is not explicitly present, follow the fallback rule from its description. ` +
      `Normalize units: area -> square kilometers; forestCoverage -> percentage with one decimal place; annualVisitors -> convert to an integer count of ten-thousands of people (round to nearest) if another unit is provided. ` +
      `For each field, also return the corresponding "...Source" string with the verbatim evidence text (everything after "Evidence:") or an empty string if not found. Preserve line breaks in evidence.\n\n` +
      `Text:\n${text ?? ""}`,
    maxRetries: 1,
  });

  const jsonResult = jsonResponse.object as ParkDetails;

  const jsonDurationSec = Number(((Date.now() - jsonStart) / 1000).toFixed(1));
  const jsonUsage = computeUsageDetail(jsonResponse.usage);
  const jsonCost = computeGeminiFlashLiteCost(jsonUsage);


  return {
    jsonResult,
    jsonUsage,
    jsonCost,
    jsonDurationSec,
  };
}
