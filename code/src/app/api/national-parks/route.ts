/* eslint-disable @typescript-eslint/no-explicit-any */
import { computeGeminiFlashLiteCost } from "@/lib/usage-utils";
import type { CostDetail, UsageDetail } from "@/lib/usage-utils";
import { extractParkText } from "./extract/park-info";
import { transformParkTextToJson } from "./extract/park-info-to-json";
import { findFieldsNeedingGoogleSearch, searchMissingFieldWithGoogle, sumUsageTotals } from "./extract/google-search-missing-fields";
import type { GoogleSearchFieldResult } from "./extract/google-search-missing-fields";

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

    const {
      text,
      textUsage,
      textCost,
      rawGrounding,
      groundingMetadata,
      textDurationSec,
    } = await extractParkText(name, url);

    const {
      jsonResult,
      jsonUsage,
      jsonCost,
      jsonDurationSec,
    } = await transformParkTextToJson(text, url);

    let finalJsonResult = jsonResult;
    let googleSearchUsage: UsageDetail | undefined;
    let googleSearchCost: CostDetail | undefined;
    let googleSearchDurationSec: number | undefined;
    let googleSearchDetails: GoogleSearchFieldResult[] | undefined;

    const fieldsNeedingGoogle = findFieldsNeedingGoogleSearch(jsonResult);
    if (fieldsNeedingGoogle.length > 0 && fieldsNeedingGoogle.length <= 3) {
      const perFieldResults: GoogleSearchFieldResult[] = [];

      for (const field of fieldsNeedingGoogle) {
        const result = await searchMissingFieldWithGoogle({
          parkName: name,
          field,
        });
        perFieldResults.push(result);

        finalJsonResult = {
          ...finalJsonResult,
          ...result.value as any,
        };
      }

      googleSearchDetails = perFieldResults;
      googleSearchUsage = sumUsageTotals(perFieldResults.map(item => item.usage));
      googleSearchCost = computeGeminiFlashLiteCost(googleSearchUsage);
      googleSearchDurationSec = Number(
        perFieldResults.reduce((sum, item) => sum + item.durationSec, 0).toFixed(1),
      );
    }

    return new Response(
      JSON.stringify({
        text,
        json: finalJsonResult,
        textUsage,
        jsonUsage,
        textCost,
        jsonCost,
        rawGrounding,
        groundingMetadata,
        textDurationSec,
        jsonDurationSec,
        googleSearchUsage,
        googleSearchCost,
        googleSearchDurationSec,
        googleSearchDetails,
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
