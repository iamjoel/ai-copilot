import { logger } from "@/lib/logger";
import { commonWithContextTool, geminiWithContextTool } from "@/lib/model-factory";
import { MODEL_GROUPS, type ModelPresetKey, getModelPreset } from "@/lib/model-presets";
import outputRules from "@/prompts/output-rule";
import { generateText } from "ai";

export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

// Get the list of allowed models from Gemini API
const ALLOWED_MODELS = new Set<ModelPresetKey>(
  MODEL_GROUPS.flatMap(group => group.options.map(option => option.value)),
);

export async function POST(req: Request) {
  try {
    const { prompt: rawPrompt, model } = (await req.json()) as {
      prompt?: string;
      model?: string;
    };

    if (!rawPrompt || !model) {
      return new Response(
        JSON.stringify({
          error: "Missing prompt or model selection.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // const prompt = `${rawPrompt.trim()}\n${outputRules}`;
    const prompt = rawPrompt.trim();

    if (!ALLOWED_MODELS.has(model as ModelPresetKey)) {
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
    logger.info(`LLM info: ${JSON.stringify(target, null, 2)}`);
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
