import { logger } from "@/lib/logger";
import { getModel } from "@/lib/model-factory";
import { MODEL_GROUPS, type ModelPreset, type ModelPresetKey, getModelPreset } from "@/lib/model-presets";
import composeFinalPrompt from "@/prompts/quality-answer-flow/final-prompt";
import getIntentPrompt from "@/prompts/quality-answer-flow/intent-classify";
import SYSTEM_CONFIG from "@/prompts/quality-answer-flow/strategy-libs";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

const ALLOWED_MODELS = new Set<ModelPresetKey>(
  MODEL_GROUPS.flatMap(group => group.options.map(option => option.value)),
);

type ClassificationResult = {
  category: string;
  sub_category: string;
  domain: string;
  complexity: number;
  methodology?: string;
  analysis_reasoning?: string;
};

const classificationSchema = z.object({
  category: z.string().min(1).describe("Intent category label"),
  sub_category: z.string().min(1).describe("Sub-intent label"),
  domain: z.string().min(1).describe("Domain or industry label"),
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

    const normalizedCategory = classification.category.trim() || "General";
    const normalizedSubCategory = classification.sub_category.trim() || "General";
    const normalizedDomain = classification.domain.trim();
    const domainContext =
      SYSTEM_CONFIG.DOMAINS[normalizedDomain as keyof typeof SYSTEM_CONFIG.DOMAINS] ||
      "Context: General professional reasoning and clear communication.";
    const subStrategy =
      SYSTEM_CONFIG.STRATEGIES[normalizedCategory]?.[normalizedSubCategory] ||
      SYSTEM_CONFIG.STRATEGIES[normalizedCategory]?.General;

    const rawMethodology = classification.methodology?.trim();
    const methodologyKey =
      rawMethodology && rawMethodology.toLowerCase() !== "none" ? rawMethodology : "";
    const resolvedMethodology = methodologyKey || subStrategy?.methodology || "General";
    const strategyName = subStrategy ? `${normalizedCategory}/${normalizedSubCategory}` : null;
    stepLogger.info({
      step: "strategy_lookup",
      methodology: resolvedMethodology,
      matched: Boolean(subStrategy),
    });

    const finalPrompt = composeFinalPrompt({
      category: normalizedCategory,
      sub_category: normalizedSubCategory,
      domain: normalizedDomain,
      complexity: classification.complexity,
      methodology: resolvedMethodology,
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
        strategy: subStrategy ?? null,
        strategyName,
        domainContext,
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
  const response: { object: ClassificationResult } = await generateObject({
    model: getModel(preset.provider, preset.model),
    schema: classificationSchema,
    prompt: getIntentPrompt(question),
    maxRetries: 2,
  });

  const { category, sub_category, domain, complexity, methodology, analysis_reasoning } =
    response.object;

  if (!category?.trim()) {
    throw new Error("Classification missing category.");
  }

  return {
    category: category.trim() || "General",
    sub_category: sub_category?.trim() || "General",
    domain: domain?.trim() || "General",
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
