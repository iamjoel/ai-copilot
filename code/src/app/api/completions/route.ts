import { commonWithContextTool, geminiWithContextTool } from "@/lib/model-factory";
import { getModelPreset } from "@/lib/model-presets";
import { generateText } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

const ALLOWED_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3", "gpt-4o-mini"]);

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

    if (!ALLOWED_MODELS.has(model)) {
      return new Response(
        JSON.stringify({ error: "Unsupported model." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const target = getModelPreset(model);
    if (!target) {
      return new Response(
        JSON.stringify({ error: "Model preset not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    const isGeminiModel = target.provider === "google";
    const modelWithContextTool = isGeminiModel ? geminiWithContextTool : commonWithContextTool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateText(modelWithContextTool(target.provider, target.model, prompt) as any);

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
