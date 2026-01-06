import { z } from "zod/v3";
import { generateText, streamText } from "ai";
import { getModel } from "@/lib/model-factory";
import { MODEL_GROUPS, getModelPreset } from "@/lib/model-presets";
import { logger } from "@/lib/logger";
import { countInputTokens } from "@/lib/token-count";
import { promises as fs } from "node:fs";
import path from "node:path";

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
  mode: z.enum(["count", "translate", "stream"]).optional(),
});

const languageLabels: Record<"en" | "zh", string> = {
  en: "English",
  zh: "Chinese",
};

type PricingInfo = {
  inputPerMillion: number;
  outputPerMillion: number;
  inputPerMillionOver200k?: number;
  outputPerMillionOver200k?: number;
};

const MODEL_PRICING: Record<string, PricingInfo> = {
  "gemini-3-pro-preview": {
    inputPerMillion: 2.0,
    outputPerMillion: 12.0,
    inputPerMillionOver200k: 4.0,
    outputPerMillionOver200k: 18.0,
  },
  "gemini-3-flash-preview": { inputPerMillion: 0.5, outputPerMillion: 3.0 },
  "gemini-2.5-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 10.0,
    inputPerMillionOver200k: 2.5,
    outputPerMillionOver200k: 15.0,
  },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "claude-opus-4-5": { inputPerMillion: 5.0, outputPerMillion: 25.0 },
  "claude-sonnet-4-5": { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  "claude-haiku-4-5": { inputPerMillion: 1.0, outputPerMillion: 5.0 },
};

const PER_MILLION = 1_000_000;
const LONG_CONTEXT_THRESHOLD = 200_000;

function buildSystemPrompt(targetLanguage: "en" | "zh") {
  return `You are a professional translator. Translate the user's text to ${languageLabels[targetLanguage]}.
Preserve meaning, tone, formatting, and line breaks. Output only the translated text.`;
}

function formatTimestamp(value: Date) {
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}/${hours}:${minutes}`;
}

function getPricing(modelKey: string, inputTokenCount: number | null) {
  const pricing = MODEL_PRICING[modelKey];
  if (!pricing) {
    return null;
  }
  if (
    inputTokenCount !== null &&
    inputTokenCount > LONG_CONTEXT_THRESHOLD &&
    pricing.inputPerMillionOver200k !== undefined &&
    pricing.outputPerMillionOver200k !== undefined
  ) {
    return {
      inputPerToken: pricing.inputPerMillionOver200k / PER_MILLION,
      outputPerToken: pricing.outputPerMillionOver200k / PER_MILLION,
    };
  }
  return {
    inputPerToken: pricing.inputPerMillion / PER_MILLION,
    outputPerToken: pricing.outputPerMillion / PER_MILLION,
  };
}

async function appendTranslationUsage({
  model,
  inputTokens,
  outputTokens,
  costUsd,
  durationSeconds,
}: {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  durationSeconds: number | null;
}) {
  const outputDir = path.join(process.cwd(), "outputs");
  const outputPath = path.join(outputDir, "translate-usage.csv");
  const summaryPath = path.join(outputDir, "translate-usage-summary.csv");
  await fs.mkdir(outputDir, { recursive: true });

  const header = "time,cost_usd,model,input_tokens,output_tokens,duration_s\n";
  const timestamp = formatTimestamp(new Date());
  const row = [
    timestamp,
    costUsd !== null ? costUsd.toFixed(6) : "",
    model,
    inputTokens ?? "",
    outputTokens ?? "",
    durationSeconds !== null ? durationSeconds.toFixed(3) : "",
  ].join(",");

  let existing = "";
  try {
    existing = await fs.readFile(outputPath, "utf8");
  } catch {
    existing = header;
  }

  const lines = existing.trimEnd().split("\n");
  const hasHeader = lines[0] === header.trim();
  const contentLines = hasHeader ? lines.slice(1) : lines;
  const updated = [header.trim(), row, ...contentLines].join("\n") + "\n";
  await fs.writeFile(outputPath, updated, "utf8");

  await updateSummaryCsv({
    sourceLines: [row, ...contentLines],
    summaryPath,
  });
}

async function updateSummaryCsv({
  sourceLines,
  summaryPath,
}: {
  sourceLines: string[];
  summaryPath: string;
}) {
  const summaryHeader = "model,total_cost_usd\n";
  const totals = new Map<string, number>();

  for (const line of sourceLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(",");
    if (parts.length < 3) {
      continue;
    }
    const costRaw = parts[1];
    const model = parts[2];
    const cost = Number(costRaw);
    if (!Number.isFinite(cost)) {
      continue;
    }
    totals.set(model, (totals.get(model) ?? 0) + cost);
  }

  const rows = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([model, total]) => `${model},${total.toFixed(6)}`);
  const summary = [summaryHeader.trim(), ...rows].join("\n") + "\n";
  await fs.writeFile(summaryPath, summary, "utf8");
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

    if (mode === "stream") {
      const startTime = Date.now();
      logger.info({
        step: "translate_stream_start",
        model,
        provider: modelPreset.provider,
        targetLanguage,
        textLength: text.length,
      });

      const result = streamText({
        model: getModel(modelPreset.provider, modelPreset.model),
        system: systemPrompt,
        prompt: text,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: Record<string, unknown>) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
          };

          try {
            send({ type: "meta", inputTokens });

            for await (const delta of result.textStream) {
              send({ type: "delta", text: delta });
            }

            const usage = await result.totalUsage;
            const outputTokens = usage.outputTokens ?? usage.completionTokens ?? null;
            const usageInputTokens = usage.inputTokens ?? usage.promptTokens ?? null;
            const totalTokens =
              usage.totalTokens ??
              (usageInputTokens !== null && outputTokens !== null
                ? usageInputTokens + outputTokens
                : null);
            const pricing = getPricing(model, usageInputTokens ?? inputTokens ?? null);
            const costUsd =
              pricing && usageInputTokens !== null && outputTokens !== null
                ? usageInputTokens * pricing.inputPerToken + outputTokens * pricing.outputPerToken
                : null;

            logger.info({
              step: "translate_stream_completed",
              model,
              provider: modelPreset.provider,
              targetLanguage,
              inputTokens,
              outputTokens,
              totalTokens,
            });
            const durationSeconds = (Date.now() - startTime) / 1000;
            await appendTranslationUsage({
              model,
              inputTokens: usageInputTokens ?? inputTokens ?? null,
              outputTokens,
              costUsd,
              durationSeconds,
            });

            send({
              type: "done",
              inputTokens,
              outputTokens,
              totalTokens,
            });
            controller.close();
          } catch (error) {
            logger.error({ step: "translate_stream_error", error });
            send({ type: "error", message: "Unable to stream translation." });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    logger.info({
      step: "translate_start",
      model,
      provider: modelPreset.provider,
      targetLanguage,
      textLength: text.length,
    });

    const startTime = Date.now();
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
    const pricing = getPricing(model, usageInputTokens ?? inputTokens ?? null);
    const costUsd =
      pricing && usageInputTokens !== null && outputTokens !== null
        ? usageInputTokens * pricing.inputPerToken + outputTokens * pricing.outputPerToken
        : null;

    logger.info({
      step: "translate_completed",
      model,
      provider: modelPreset.provider,
      targetLanguage,
      inputTokens,
      outputTokens,
      totalTokens,
    });
    const durationSeconds = (Date.now() - startTime) / 1000;
    await appendTranslationUsage({
      model,
      inputTokens: usageInputTokens ?? inputTokens ?? null,
      outputTokens,
      costUsd,
      durationSeconds,
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
