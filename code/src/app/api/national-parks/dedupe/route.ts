import { prisma } from "@root/lib/prisma";

export const runtime = "nodejs";

type ParkKey = {
  id: string;
  name: string;
  country: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export async function POST(req: Request) {
  try {
    const { country } = (await req.json()) as { country?: string };
    const trimmedCountry = country?.trim();

    if (!trimmedCountry) {
      return new Response(
        JSON.stringify({ error: "country is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const parks = await prisma.nationalPark.findMany({
      where: { country: { equals: trimmedCountry, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, country: true },
    });

    const seen = new Map<string, string>();
    const duplicates: ParkKey[] = [];

    for (const park of parks) {
      const key = `${normalize(park.name)}|${normalize(park.country)}`;
      if (seen.has(key)) {
        duplicates.push(park);
      } else {
        seen.set(key, park.id);
      }
    }

    if (!duplicates.length) {
      return new Response(
        JSON.stringify({ country: trimmedCountry, removed: 0, duplicates: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const duplicateIds = duplicates.map(park => park.id);
    await prisma.nationalPark.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    return new Response(
      JSON.stringify({
        country: trimmedCountry,
        removed: duplicateIds.length,
        duplicates,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Deduplicate national parks error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to deduplicate national parks." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
