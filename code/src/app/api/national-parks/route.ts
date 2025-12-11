/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../../../lib/prisma";
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

    let finalJsonResult = (() => {
      // sort the keys
      const res: Record<string, any> = {}
      Object.keys(jsonResult).filter(key => !key.endsWith("SourceText") && !key.endsWith("SourceUrl")).forEach((key) => {
        res[key] = jsonResult[key as keyof typeof jsonResult];
        res[`${key}SourceText`] = jsonResult[`${key}SourceText` as keyof typeof jsonResult];
        res[`${key}SourceUrl`] = jsonResult[`${key}SourceUrl` as keyof typeof jsonResult];
      });
      return res;
    })()
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

    const asNumber = (value: unknown, fallback = -1) =>
      typeof value === "number" && !Number.isNaN(value) ? value : fallback;

    const asString = (value: unknown) => (typeof value === "string" ? value : "");

    const nationalParkData = {
      wiki: asString(text),
      wikiUrl: url,
      wikiInputToken: textUsage?.inputTokens ?? null,
      wikiOutputToken: textUsage?.outputTokens ?? null,
      wikiUrlToken: textUsage?.urlTokens ?? null,
      wikiProcessTime: textDurationSec ?? null,

      officialWebsite: asString(finalJsonResult.officialWebsite),
      officialWebsiteSourceText: asString(finalJsonResult.officialWebsiteSourceText),
      officialWebsiteSourceUrl: asString(finalJsonResult.officialWebsiteSourceUrl),

      level: asNumber(finalJsonResult.level),
      levelSourceText: asString(finalJsonResult.levelSourceText),
      levelSourceUrl: asString(finalJsonResult.levelSourceUrl),

      speciesCount: asNumber(finalJsonResult.speciesCount),
      speciesCountSourceText: asString(finalJsonResult.speciesCountSourceText),
      speciesCountSourceUrl: asString(finalJsonResult.speciesCountSourceUrl),

      endangeredSpecies: asNumber(finalJsonResult.endangeredSpecies),
      endangeredSpeciesSourceText: asString(finalJsonResult.endangeredSpeciesSourceText),
      endangeredSpeciesSourceUrl: asString(finalJsonResult.endangeredSpeciesSourceUrl),

      forestCoverage: asNumber(finalJsonResult.forestCoverage),
      forestCoverageSourceText: asString(finalJsonResult.forestCoverageSourceText),
      forestCoverageSourceUrl: asString(finalJsonResult.forestCoverageSourceUrl),

      area: asNumber(finalJsonResult.area),
      areaSourceText: asString(finalJsonResult.areaSourceText),
      areaSourceUrl: asString(finalJsonResult.areaSourceUrl),

      establishedYear: asNumber(finalJsonResult.establishedYear),
      establishedYearSourceText: asString(finalJsonResult.establishedYearSourceText),
      establishedYearSourceUrl: asString(finalJsonResult.establishedYearSourceUrl),

      internationalCert: asNumber(finalJsonResult.internationalCert),
      internationalCertSourceText: asString(finalJsonResult.internationalCertSourceText),
      internationalCertSourceUrl: asString(finalJsonResult.internationalCertSourceUrl),

      annualVisitors: asNumber(finalJsonResult.annualVisitors),
      annualVisitorsSourceText: asString(finalJsonResult.annualVisitorsSourceText),
      annualVisitorsSourceUrl: asString(finalJsonResult.annualVisitorsSourceUrl),
    };

    const existingPark = await prisma.nationalPark.findUnique({
      where: { wikiUrl: url },
      select: { id: true },
    });

    if (!existingPark) {
      await prisma.nationalPark.create({
        data: nationalParkData,
      });
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
