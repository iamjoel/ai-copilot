/* eslint-disable @typescript-eslint/no-explicit-any */
import { createNationalPark, getNationalParkByName } from "@root/lib/db/nation-parks";
import extractFormWiki from "../../service/extract-from-wiki";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type CsvPark = {
  name: string;
  wikiUrl: string;
};

type ParkProcessResult =
  | ({ status: "success" } & {
    createdId: string;
    name: string;
  })
  | ({ status: "error"; message: string; isExisting?: boolean } & Partial<CsvPark>);

function parseCsv(content: string): CsvPark[] {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const namePos = 0;
  const wikiPos = 1;

  const rows = lines.slice(1);
  return rows
    .map(line => {
      const cols = line.split(",").map(col => col.replace(/^"|"$/g, "").trim());
      const name = cols[namePos];
      const wikiUrl = cols[wikiPos];
      return { name, wikiUrl };
    })
    .filter(item => item.name && item.wikiUrl);
}

async function processPark({ name, wikiUrl, country }: CsvPark & { country: string }): Promise<ParkProcessResult | { status: "error" }> {
  const existingPark = await getNationalParkByName(name);
  if (existingPark)
    return {
      status: "error" as const,
      isExisting: true,
    }
  const {
    text,
    jsonResult,
    usagePage,
    durationSec,
  } = await extractFormWiki(name, wikiUrl);

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
    name,
    country,
    wiki: text,
    wikiUrl,
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

  return {
    status: "success" as const,
    name,
    createdId: savedPark.id,
  };
}

export async function POST(req: Request) {
  try {
    const { countryName } = (await req.json()) as { countryName?: string };
    const normalizedCountry = countryName?.trim();

    if (!normalizedCountry) {
      return new Response(
        JSON.stringify({ error: "Missing countryName." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const filePath = path.join(process.cwd(), "src/app/api/national-parks/datas", `${normalizedCountry}.csv`);
    console.log(filePath)
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `CSV not found for country: ${normalizedCountry}` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const parks = parseCsv(content);

    if (parks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid rows in CSV." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const results: ParkProcessResult[] = [];
    for (const park of parks) {
      try {
        const parkResult = await processPark({ ...park, country: normalizedCountry! });
        results.push(parkResult as ParkProcessResult);
      } catch (error) {
        results.push({
          status: "error",
          name: park.name,
          message: `Failed to process park: ${park.name}`,
          isExisting: false,
        });
      }
    }

    const successCount = results.filter(r => r.status === "success" || r.isExisting).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        country: normalizedCountry,
        total: results.length,
        success: successCount,
        failure: failureCount,
        failureList: results.filter(r => r.status === "error" && !r.isExisting),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Batch extract endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process batch right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
