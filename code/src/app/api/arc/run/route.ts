import { logger } from "@/lib/logger";
import { getModel } from "@/lib/model-factory";
import {
  parseArcChoices,
  readArcCsv,
  writeArcCsv,
  withDatasetLock,
  QWEN_RESULT_COLUMNS,
  type ArcChoice,
  type ArcDatasetType,
  type ArcModelKey,
} from "@/lib/arc-dataset";
import { generateText } from "ai";

export const runtime = "nodejs";

const runLogger = logger.child({ feature: "arc-run" });

type RunRequestBody = {
  id?: string;
  datasetType?: ArcDatasetType;
  model?: ArcModelKey;
  question?: string;
  choices?: ArcChoice[];
  answerKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RunRequestBody;
    const datasetType = body.datasetType;
    const modelKey = body.model;

    if (!modelKey) {
      return createErrorResponse("Missing model.");
    }

    const columnName = QWEN_RESULT_COLUMNS[modelKey];
    if (!columnName) {
      return createErrorResponse("Unsupported model.");
    }

    if (datasetType && body.id) {
      return withDatasetLock(datasetType, async () => {
        const { header, rows } = readArcCsv(datasetType);
        const rowIndex = rows.findIndex(row => row.id === body.id);
        if (rowIndex === -1) {
          return createErrorResponse("Row not found.", 404);
        }

        const row = rows[rowIndex];
        const question = row.question?.trim() ?? "";
        const choices = parseArcChoices(row.choices ?? "");
        const answerKey = row.answerKey ?? "";

        if (!question) {
          return createErrorResponse("Missing question.");
        }

        if (!choices.length) {
          return createErrorResponse("Missing choices.");
        }

        const prompt = buildArcPrompt(question, choices);
        runLogger.info({
          step: "arc_run_start",
          datasetType,
          model: modelKey,
          rowIndex: rowIndex + 1,
          id: row.id,
          choiceCount: choices.length,
        });

        const startTime = Date.now();
        const result = await generateText({
          model: getModel("qwen", modelKey),
          prompt,
        });
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const prediction = extractChoiceLabel(result.text);
        const correctness = prediction === answerKey ? "right" : "wrong";
        const usage = result.usage ?? {};
        const totalTokens = usage.totalTokens ?? 0;
        const inputTokens = usage.promptTokens ?? 0;
        const outputTokens = usage.completionTokens ?? 0;

        row[columnName] = formatResult({
          correctness,
          prediction,
          totalTokens,
          inputTokens,
          outputTokens,
          elapsedSeconds,
        });

        if (!header.includes(columnName)) {
          header.push(columnName);
        }

        writeArcCsv(datasetType, header, rows);

        runLogger.info({
          step: "arc_run_completed",
          datasetType,
          model: modelKey,
          rowIndex: rowIndex + 1,
          id: row.id,
          prediction,
          answerKey,
          elapsedSeconds,
          totalTokens,
          inputTokens,
          outputTokens,
        });

        return new Response(
          JSON.stringify({
            prediction,
            raw: result.text,
            model: modelKey,
            formatted: row[columnName],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });
    }

    const question = body.question?.trim();
    const choices = body.choices ?? [];
    const answerKey = body.answerKey ?? "";

    if (!question) {
      return createErrorResponse("Missing question.");
    }

    if (!choices.length) {
      return createErrorResponse("Missing choices.");
    }

    const prompt = buildArcPrompt(question, choices);
    runLogger.info({ step: "arc_run_start", model: modelKey, choiceCount: choices.length });

    const startTime = Date.now();
    const result = await generateText({
      model: getModel("qwen", modelKey),
      prompt,
    });
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const prediction = extractChoiceLabel(result.text);
    const correctness = prediction === answerKey ? "right" : "wrong";
    const usage = result.usage ?? {};
    const totalTokens = usage.totalTokens ?? 0;
    const inputTokens = usage.promptTokens ?? 0;
    const outputTokens = usage.completionTokens ?? 0;

    runLogger.info({ step: "arc_run_completed", model: modelKey, prediction });

    return new Response(
      JSON.stringify({
        prediction,
        raw: result.text,
        model: modelKey,
        formatted: formatResult({
          correctness,
          prediction,
          totalTokens,
          inputTokens,
          outputTokens,
          elapsedSeconds,
        }),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    runLogger.error({ step: "arc_run_error", error });
    return new Response(JSON.stringify({ error: "ARC run failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildArcPrompt(question: string, choices: ArcChoice[]) {
  const choiceLines = choices
    .map(choice => `${choice.label}. ${choice.text}`)
    .join("\n");

  return [
    "You are answering a multiple-choice question from the ARC dataset.",
    "Pick the best answer and reply with only the option label (A, B, C, or D).",
    "",
    `Question: ${question}`,
    "Choices:",
    choiceLines,
    "",
    "Answer:",
  ].join("\n");
}

function extractChoiceLabel(text: string) {
  const match = text.match(/\b([A-D])\b/i);
  if (match?.[1]) {
    return match[1].toUpperCase();
  }
  return text.trim().slice(0, 20);
}

function formatResult({
  correctness,
  prediction,
  totalTokens,
  inputTokens,
  outputTokens,
  elapsedSeconds,
}: {
  correctness: "right" | "wrong";
  prediction: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  elapsedSeconds: number;
}) {
  return [
    `answer: ${correctness}(${prediction})`,
    `token: ${totalTokens}, ${inputTokens}, ${outputTokens}`,
    `time: ${elapsedSeconds.toFixed(1)}s`,
  ].join("\n");
}

function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
