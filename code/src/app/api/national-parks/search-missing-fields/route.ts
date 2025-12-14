/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@root/lib/prisma";
import { GOOGLE_SEARCH_FIELDS, type GoogleSearchField } from "@/app/national-parks/google-search-fields";
import { searchFieldWithGoogle } from "../extract/service/google-search-missing-fields";
import type { FieldsType } from "../extract/fields";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function isFieldMissing(park: any, field: GoogleSearchField): boolean {
  const value = park[field];

  if (typeof value === "number") {
    return value === -1;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const { parkName } = (await req.json()) as { parkName?: string };
    const name = parkName?.trim();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Missing parkName." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const park = await prisma.nationalPark.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (!park) {
      return new Response(
        JSON.stringify({ error: "Park not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const missingFields = GOOGLE_SEARCH_FIELDS.filter(field => isFieldMissing(park, field));

    if (missingFields.length === 0) {
      return new Response(
        JSON.stringify({ message: "没有缺失字段。", missingFields }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (missingFields.length > 3) {
      return new Response(
        JSON.stringify({ error: "缺失数量太多" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const searchResults = [];
    const updates: Record<string, string | number> = {};

    for (const field of missingFields) {
      const result = await searchFieldWithGoogle({
        parkName: park.name,
        field: field as FieldsType,
      });
      searchResults.push(result);

      Object.assign(updates, result.value as Record<string, string | number>);
    }

    if (Object.keys(updates).length > 0) {
      logger.info(`Updating ${park.name}:\n ${JSON.stringify(updates, null, 2)}`);
      await prisma.nationalPark.update({
        where: { id: park.id },
        data: updates,
      });
    }

    return new Response(
      JSON.stringify({
        parkId: park.id,
        missingFields,
        updates,
        searchResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Search missing fields endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to fill missing fields right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
