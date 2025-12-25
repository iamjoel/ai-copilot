import { logger } from "@/lib/logger";
import { commonWithContextTool, geminiWithContextTool } from "@/lib/model-factory";
import { MODEL_GROUPS, getModelPreset } from "@/lib/model-presets";
import { streamText } from "ai";
import checkInput from "@/app/api/utils/check-input";
import { promptConfigSchema, buildPrompt } from "@/app/api/completions/utils";
import { z } from 'zod/v3';


export const runtime = "nodejs"; // 'edge' runtime does not support undici yet

// Get the list of allowed models from Gemini API
const ALLOWED_MODELS = new Set<string>(
  MODEL_GROUPS.flatMap(group => group.options.map(option => option.value)),
);

const ParamsSchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required"),
  model: z
    .string()
    .trim()
    .min(1, "model is required")
    .refine(value => ALLOWED_MODELS.has(value as string), {
      message: "Unsupported model.",
    }),
  config: promptConfigSchema,
});

type Params = z.infer<typeof ParamsSchema>;

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = await req.json();
    const { isValid, response, data } = checkInput(body, ParamsSchema);
    if (!isValid) {
      return response;
    }

    const { prompt: rawPrompt, model, config } = data as Params;

    const prompt = buildPrompt(rawPrompt, config);
    const modelPreset = getModelPreset(model);

    if (!modelPreset) {
      throw new Error(`Model preset not found: ${model}`);
    }
    const isGeminiModel = modelPreset.provider === "google";
    logger.info(`LLM info: ${JSON.stringify(modelPreset, null, 2)}`);

    const modelWithContextTool = isGeminiModel ? geminiWithContextTool : commonWithContextTool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText(modelWithContextTool(modelPreset.provider, modelPreset.model, prompt) as any);
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            totalTokens: part.totalUsage.totalTokens,
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            reasoningTokens: part.totalUsage.reasoningTokens,
            urlTokens: (part.totalUsage.totalTokens ?? 0) - (part.totalUsage.inputTokens ?? 0) - (part.totalUsage.outputTokens ?? 0) - (part.totalUsage.reasoningTokens ?? 0),
          };
        }
      },
    });
  } catch (error) {
    console.error("Completion error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate text right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
