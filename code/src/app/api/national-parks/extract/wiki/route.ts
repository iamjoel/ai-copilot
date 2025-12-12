/* eslint-disable @typescript-eslint/no-explicit-any */
import { createNationalPark, getNationalParkByName } from "@root/lib/db/nation-parks";
import extractFormWiki from "../service/extract-from-wiki";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, country, wikiUrl } = (await req.json()) as {
      name?: string;
      country?: string;
      wikiUrl?: string;
    };

    const parkName = name?.trim();
    const parkCountry = country?.trim();
    const url = wikiUrl?.trim();

    if (!parkName || !parkCountry || !url) {
      return new Response(
        JSON.stringify({ error: "Missing name, country, or wikiUrl." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const existingPark = await getNationalParkByName(parkName);
    if (existingPark) {
      return new Response(
        JSON.stringify({ error: "Park with this name already exists." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }


    const {
      text,
      jsonResult,
      usagePage,
      durationSec,
    } = await extractFormWiki(parkName, url);

    const finalJsonResult = (() => {
      const res: Record<string, any> = {};
      Object.keys(jsonResult)
        .filter(key => !key.endsWith("SourceText") && !key.endsWith("SourceUrl"))
        .forEach((key) => {
          res[key] = jsonResult[key as keyof typeof jsonResult];
          res[`${key}SourceText`] = jsonResult[`${key}SourceText` as keyof typeof jsonResult];
          res[`${key}SourceUrl`] = jsonResult[`${key}SourceUrl` as keyof typeof jsonResult];
        });
      return res;
    })();

    const asNumber = (value: unknown, fallback = -1) =>
      typeof value === "number" && !Number.isNaN(value) ? value : fallback;
    const asString = (value: unknown) => (typeof value === "string" ? value : "");

    const nationalParkData = {
      name: parkName,
      country: parkCountry,
      wiki: text,
      wikiUrl: url,
      wikiInputToken: usagePage?.inputTokens ?? null,
      wikiOutputToken: usagePage?.outputTokens ?? null,
      wikiUrlToken: usagePage?.urlTokens ?? null,
      wikiProcessTime: durationSec ?? null,

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

    const savedPark = await createNationalPark(nationalParkData);

    return new Response(
      JSON.stringify({
        id: savedPark.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
