import { getModel } from "@/lib/model-factory";
import { computeGeminiFlashLiteCost, computeUsageDetail } from "@/lib/usage-utils";
import { generateObject } from "ai";
import { ParkDetail, parkSchemaWithSourceText } from "./fields";

export type Result = {
  jsonResult: ParkDetail;
  jsonUsage: ReturnType<typeof computeUsageDetail>;
  jsonCost: ReturnType<typeof computeGeminiFlashLiteCost>;
  jsonDurationSec: number;
};

export async function transformParkTextToJson(text: string, sourceUrl: string): Promise<Result> {
  const jsonStart = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonResponse = await generateObject<any>({
    model: getModel("google", "models/gemini-2.5-flash-lite"),
    schema: parkSchemaWithSourceText,
    prompt:
      `You will receive text about a national park. Using only that text (do not browse the web), ` +
      `return a JSON object that captures the park's details. If a field is not explicitly present, follow the fallback rule from its description. ` +
      `Normalize units: area -> square kilometers; forestCoverage -> percentage with one decimal place; annualVisitors -> convert to an integer count of ten-thousands of people (round to nearest) if another unit is provided. ` +
      `For each field, also return the corresponding "...Source" string with the verbatim evidence text (everything after "Evidence:") or an empty string if not found. Preserve line breaks in evidence.\n\n` +
      `Text:\n${text ?? ""}`,
    maxRetries: 1,
  });

  const jsonResult = jsonResponse.object as ParkDetail;
  const formattedJsonResult = {
    ...jsonResult,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  Object.keys(jsonResult).filter(key => !key.endsWith("SourceText")).forEach((key) => {
    formattedJsonResult[`${key}SourceUrl`] = sourceUrl;
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
