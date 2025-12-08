import { extractParkText } from "./extract-park-text";
import { transformParkTextToJson } from "./transform-park-text";

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
    } = await transformParkTextToJson(text);

    return new Response(
      JSON.stringify({
        text,
        json: jsonResult,
        textUsage,
        jsonUsage,
        textCost,
        jsonCost,
        rawGrounding,
        groundingMetadata,
        textDurationSec,
        jsonDurationSec,
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
