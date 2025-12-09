import { getModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetail } from "@/lib/usage-utils";
import { generateObject } from "ai";
import { z } from "zod";
import { parkDetailsSchema } from "./fields";

const handleEvidenceText = ({
  value,
  evidenceText,
  evidenceUrl,
}: { value?: string | number; evidenceText: string; evidenceUrl: string }) => {
  if (!value || value === -1 || value === '')
    return ''
  if (!evidenceUrl || !evidenceText)
    return ''
  return `${evidenceText}: ${evidenceUrl}`
}



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

export async function transformParkTextToJson(text: string, evidenceUrl: string): Promise<TransformResult> {
  const jsonStart = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonResponse = await generateObject<any>({
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
  const formattedJsonResult = {
    ...jsonResult,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  Object.keys(jsonResult).filter(key => !key.endsWith("Source")).forEach((key) => {
    formattedJsonResult[`${key}Source`] = handleEvidenceText({
      value: jsonResult[key as keyof ParkDetails],
      evidenceText: jsonResult[`${key}Source` as keyof ParkDetails] as string,
      evidenceUrl: evidenceUrl,
    });
  })

  const jsonDurationSec = Number(((Date.now() - jsonStart) / 1000).toFixed(1));
  const jsonUsage = computeUsageDetail(jsonResponse.usage);
  const jsonCost = computeGeminiFlashLiteCost(jsonUsage);



  return {
    jsonResult: formattedJsonResult,
    jsonUsage,
    jsonCost,
    jsonDurationSec,
  };
}
