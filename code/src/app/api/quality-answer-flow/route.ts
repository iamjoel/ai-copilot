import { logger } from "@/lib/logger";
import { getModel } from "@/lib/model-factory";
import { MODEL_GROUPS, type ModelPreset, type ModelPresetKey, getModelPreset } from "@/lib/model-presets";
import composeFinalPrompt from "@/prompts/quality-answer-flow/final-prompt";
import getIntentPrompt from "@/prompts/quality-answer-flow/intent-classify";
import STRATEGY_LIBRARY from "@/prompts/quality-answer-flow/strategy-libs";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

const ALLOWED_MODELS = new Set<ModelPresetKey>(
  MODEL_GROUPS.flatMap(group => group.options.map(option => option.value)),
);

type ClassificationResult = {
  category: string;
  complexity: number;
  methodology?: string;
  analysis_reasoning?: string;
};

const classificationSchema = z.object({
  category: z.string().describe("Intent category label"),
  complexity: z.coerce.number().min(1).max(5).describe("Complexity score between 1-5"),
  methodology: z.string().optional().describe("Recommended methodology or None"),
  analysis_reasoning: z.string().optional().describe("Brief explanation for the choice"),
});

const flowLogger = logger.child({ feature: "quality-answer-flow" });

export async function POST(req: Request) {
  try {
    const { question, model } = (await req.json()) as {
      question?: string;
      model?: string;
    };

    if (!question?.trim()) {
      return createErrorResponse("Missing question.");
    }

    if (!model) {
      return createErrorResponse("Missing model selection.");
    }

    if (!ALLOWED_MODELS.has(model as ModelPresetKey)) {
      return createErrorResponse("Unsupported model.", 400);
    }

    const target = getModelPreset(model);
    if (!target) {
      return createErrorResponse("Model preset not found.", 404);
    }

    const stepLogger = flowLogger.child({
      model,
      provider: target.provider,
    });

    const runModel = async (prompt: string) => {
      const model = getModel(target.provider, target.model);
      const result = await generateText({
        model,
        prompt,
      });
      return result.text;
    };

    stepLogger.info({ step: "intent_classification_start", question });
    const classification = await parseClassification(question, target);
    stepLogger.info({ step: "intent_classification_parsed", classification });

    const rawMethodology = classification.methodology?.trim();
    const methodologyKey =
      rawMethodology && rawMethodology.toLowerCase() !== "none" ? rawMethodology : "";
    const strategy = methodologyKey ? STRATEGY_LIBRARY[methodologyKey] : undefined;
    const strategyName = strategy ? methodologyKey || rawMethodology || "Default" : null;
    stepLogger.info({
      step: "strategy_lookup",
      methodology: methodologyKey || rawMethodology || "None",
      matched: Boolean(strategy),
    });

    const finalPrompt = composeFinalPrompt({
      category: classification.category,
      complexity: classification.complexity,
      methodology: methodologyKey || "None",
      userQuery: question.trim(),
    });
    stepLogger.info({ step: "final_prompt_ready" });

    const [guidedAnswer, directAnswer] = await Promise.all([
      runModel(finalPrompt),
      runModel(question.trim()),
    ]);
    stepLogger.info({
      step: "final_answer_completed",
      guidedAnswerLength: guidedAnswer.length,
    });
    stepLogger.info({
      step: "direct_answer_completed",
      directAnswerLength: directAnswer.length,
    });

    return new Response(
      JSON.stringify({
        classification,
        strategy: strategy ?? null,
        strategyName,
        finalPrompt,
        answer: guidedAnswer,
        directAnswer,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    flowLogger.error({ step: "quality_answer_flow_error", error });
    return new Response(
      JSON.stringify({ error: "Quality answer flow failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function parseClassification(question: string, preset: ModelPreset): Promise<ClassificationResult> {
  const response = await generateObject({
    model: getModel(preset.provider, preset.model),
    schema: classificationSchema,
    prompt: getIntentPrompt(question),
    maxRetries: 2,
  });

  const { category, complexity, methodology, analysis_reasoning } = response.object;

  if (!category) {
    throw new Error("Classification missing category.");
  }

  return {
    category,
    complexity: normalizeComplexity(complexity),
    methodology,
    analysis_reasoning,
  };
}

function normalizeComplexity(value: unknown) {
  const num = Number(value);
  if (Number.isNaN(num) || num < 1) return 1;
  if (num > 5) return 5;
  return num;
}

function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
