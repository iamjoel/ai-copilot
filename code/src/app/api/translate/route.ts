import { z } from "zod/v3";
import { generateText } from "ai";
import { getModel } from "@/lib/model-factory";
import { MODEL_GROUPS, getModelPreset } from "@/lib/model-presets";
import { logger } from "@/lib/logger";
import { countInputTokens } from "@/lib/token-count";

export const runtime = "nodejs";

const ALLOWED_PROVIDERS = new Set(["google", "anthropic"] as const);
const ALLOWED_MODELS = new Set(
  MODEL_GROUPS.filter(group => ALLOWED_PROVIDERS.has(group.provider))
    .flatMap(group => group.options.map(option => option.value)),
);

const ParamsSchema = z.object({
  text: z.string().trim().min(1, "text is required"),
  targetLanguage: z.enum(["en", "zh"]),
  model: z
    .string()
    .trim()
    .min(1, "model is required")
    .refine(value => ALLOWED_MODELS.has(value), {
      message: "Unsupported model.",
    }),
  mode: z.enum(["count", "translate"]).optional(),
});

const languageLabels: Record<"en" | "zh", string> = {
  en: "English",
  zh: "Chinese",
};

function buildSystemPrompt(targetLanguage: "en" | "zh") {
  return `You are a professional translator. Translate the user's text to ${languageLabels[targetLanguage]}.
Preserve meaning, tone, formatting, and line breaks. Output only the translated text.`;
}

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = await req.json();
    const parsed = ParamsSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors.map(item => item.message).join(" ") }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { text, targetLanguage, model, mode } = parsed.data;
    const modelPreset = getModelPreset(model);

    if (!modelPreset || !ALLOWED_PROVIDERS.has(modelPreset.provider)) {
      return new Response(JSON.stringify({ error: "Unsupported model." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(targetLanguage);
    const inputTokens = await countInputTokens({
      provider: modelPreset.provider,
      model: modelPreset.model,
      text,
      systemPrompt,
    });

    if (mode === "count") {
      return new Response(JSON.stringify({ inputTokens }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    logger.info({
      step: "translate_start",
      model,
      provider: modelPreset.provider,
      targetLanguage,
      textLength: text.length,
    });

    const result = await generateText({
      model: getModel(modelPreset.provider, modelPreset.model),
      system: systemPrompt,
      prompt: text,
    });

    const usage = result.usage ?? {};
    const outputTokens =
      usage.completionTokens ?? usage.outputTokens ?? null;
    const usageInputTokens =
      usage.promptTokens ?? usage.inputTokens ?? null;
    const totalTokens =
      usage.totalTokens ??
      (usageInputTokens !== null && outputTokens !== null
        ? usageInputTokens + outputTokens
        : null);

    logger.info({
      step: "translate_completed",
      model,
      provider: modelPreset.provider,
      targetLanguage,
      inputTokens,
      outputTokens,
      totalTokens,
    });

    return new Response(
      JSON.stringify({
        translation: result.text,
        inputTokens,
        outputTokens,
        totalTokens,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logger.error({ step: "translate_error", error });
    return new Response(JSON.stringify({ error: "Unable to translate right now." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
