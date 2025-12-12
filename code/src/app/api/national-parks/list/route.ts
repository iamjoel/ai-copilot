/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

function mapPark(park: any) {
  return {
    id: park.id,
    name: park.name,
    country: park.country,

    wiki: park.wiki,
    wikiUrl: park.wikiUrl,
    wikiInputToken: park.wikiInputToken,
    wikiOutputToken: park.wikiOutputToken,
    wikiUrlToken: park.wikiUrlToken,
    wikiProcessTime: park.wikiProcessTime,

    officialWebsite: park.officialWebsite,
    officialWebsiteSourceText: park.officialWebsiteSourceText,
    officialWebsiteSourceUrl: park.officialWebsiteSourceUrl,

    level: park.level,
    levelSourceText: park.levelSourceText,
    levelSourceUrl: park.levelSourceUrl,

    speciesCount: park.speciesCount,
    speciesCountSourceText: park.speciesCountSourceText,
    speciesCountSourceUrl: park.speciesCountSourceUrl,

    endangeredSpecies: park.endangeredSpecies,
    endangeredSpeciesSourceText: park.endangeredSpeciesSourceText,
    endangeredSpeciesSourceUrl: park.endangeredSpeciesSourceUrl,

    forestCoverage: park.forestCoverage,
    forestCoverageSourceText: park.forestCoverageSourceText,
    forestCoverageSourceUrl: park.forestCoverageSourceUrl,

    area: park.area,
    areaSourceText: park.areaSourceText,
    areaSourceUrl: park.areaSourceUrl,

    establishedYear: park.establishedYear,
    establishedYearSourceText: park.establishedYearSourceText,
    establishedYearSourceUrl: park.establishedYearSourceUrl,

    internationalCert: park.internationalCert,
    internationalCertSourceText: park.internationalCertSourceText,
    internationalCertSourceUrl: park.internationalCertSourceUrl,

    annualVisitors: park.annualVisitors,
    annualVisitorsSourceText: park.annualVisitorsSourceText,
    annualVisitorsSourceUrl: park.annualVisitorsSourceUrl,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim();
    const country = searchParams.get("country")?.trim();

    const where: any = {};
    if (name) {
      where.name = { contains: name, mode: "insensitive" };
    }
    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }

    const parks = await prisma.nationalPark.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    const items = parks.map(mapPark);

    return new Response(
      JSON.stringify({ total: items.length, items }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("List national parks endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to fetch national parks." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
