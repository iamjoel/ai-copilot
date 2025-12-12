import { FieldsType } from "../extract/fields";
import { searchMissingFieldWithGoogle } from "../extract/service/google-search-missing-fields";
import { isGoogleSearchField } from "@/app/national-parks/google-search-fields";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { parkName, field } = (await req.json()) as { parkName?: string; field?: string };
    const name = parkName?.trim();
    const selectedField = typeof field === "string" ? field.trim() : undefined;

    const fieldKey = selectedField && isGoogleSearchField(selectedField)
      ? (selectedField as FieldsType)
      : undefined;

    if (!name || !fieldKey) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid parkName/field." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await searchMissingFieldWithGoogle({
      parkName: name,
      field: fieldKey,
    });

    return new Response(
      JSON.stringify({ result }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Google search field endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to search missing field right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
