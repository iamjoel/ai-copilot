import { getModel, type Provider } from "@/lib/model-factory";
import { generateText } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

const MODEL_MAP: Record<
  string,
  { provider: Provider; model: string }
> = {
  "gemini-2.5-flash": {
    provider: "google",
    model: "models/gemini-2.0-flash-exp",
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "models/gemini-2.0-pro-exp-02-05",
  },
  "gemini-3": {
    provider: "google",
    model: "models/gemini-1.5-pro",
  },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
};

export async function POST(req: Request) {
  try {
    const { prompt, model } = (await req.json()) as {
      prompt?: string;
      model?: string;
    };

    if (!prompt || !model) {
      return new Response(
        JSON.stringify({
          error: "Missing prompt or model selection.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const target = MODEL_MAP[model];

    const result = await generateText({
      model: getModel(target.provider, target.model),
      prompt,
      maxRetries: 1,
    });
    console.log("Completion result:", result);

    return new Response(
      JSON.stringify({ text: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Completion error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate text right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
