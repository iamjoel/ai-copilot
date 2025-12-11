import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const suffix = Date.now();
    const mockWikiUrl = `https://example.com/mock-park-${suffix}`;

    const data = {
      name: 'Park1',
      country: 'CountryA',
      wiki: "Mock national park wiki content for testing insertion.",
      wikiUrl: mockWikiUrl,
      wikiInputToken: 10,
      wikiOutputToken: 20,
      wikiUrlToken: 5,
      wikiProcessTime: 1.2,

      officialWebsite: "https://mock-park.example.com",
      officialWebsiteSourceText: "Official website: https://mock-park.example.com",
      officialWebsiteSourceUrl: mockWikiUrl,

      level: 1,
      levelSourceText: "Level 1 (not a World Heritage site).",
      levelSourceUrl: mockWikiUrl,

      speciesCount: 123,
      speciesCountSourceText: "Total species: 123 recorded.",
      speciesCountSourceUrl: mockWikiUrl,

      endangeredSpecies: 7,
      endangeredSpeciesSourceText: "Endangered species listed: 7.",
      endangeredSpeciesSourceUrl: mockWikiUrl,

      forestCoverage: 65.5,
      forestCoverageSourceText: "Forest coverage reaches 65.5%.",
      forestCoverageSourceUrl: mockWikiUrl,

      area: 456.7,
      areaSourceText: "Area covers 456.7 km².",
      areaSourceUrl: mockWikiUrl,

      establishedYear: 1999,
      establishedYearSourceText: "Established in 1999.",
      establishedYearSourceUrl: mockWikiUrl,

      internationalCert: 0,
      internationalCertSourceText: "Not a World Heritage site or Biosphere Reserve.",
      internationalCertSourceUrl: mockWikiUrl,

      annualVisitors: 89,
      annualVisitorsSourceText: "Annual visitors: 890,000 people (89 ten-thousands).",
      annualVisitorsSourceUrl: mockWikiUrl,
    };

    const created = await prisma.nationalPark.create({ data });

    return new Response(
      JSON.stringify({ id: created.id, wikiUrl: created.wikiUrl }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("test-add-park error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to insert mock park." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
