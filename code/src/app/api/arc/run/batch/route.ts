import { logger } from "@/lib/logger";
import {
  parseArcChoices,
  readArcCsv,
  writeArcCsv,
  type ArcDatasetType,
  type ArcChoice,
} from "@/lib/arc-dataset";
import { getModel } from "@/lib/model-factory";
import { generateText } from "ai";

export const runtime = "nodejs";

type BatchRunRequest = {
  n?: number;
  model?: "qwen-flash" | "qwen-plus" | "qwen3-max";
  datasetType?: ArcDatasetType;
};

type ModelColumn = {
  model: BatchRunRequest["model"];
  columnName: string;
  modelName: string;
};

const MODEL_COLUMNS: ModelColumn[] = [
  { model: "qwen-flash", columnName: "Qwen Flash", modelName: "qwen-flash" },
  { model: "qwen-plus", columnName: "Qwen Plus", modelName: "qwen-plus" },
  { model: "qwen3-max", columnName: "Qwen3 max", modelName: "qwen3-max" },
];

const datasetLocks = new Map<ArcDatasetType, Promise<void>>();

export async function POST(request: Request) {
  const body = (await request.json()) as BatchRunRequest;
  const datasetType = body.datasetType;
  const modelKey = body.model;

  if (!datasetType) {
    return createErrorResponse("Missing datasetType.");
  }

  if (!modelKey) {
    return createErrorResponse("Missing model.");
  }

  const modelConfig = MODEL_COLUMNS.find(entry => entry.model === modelKey);
  if (!modelConfig) {
    return createErrorResponse("Unsupported model.");
  }

  const nValue = body.n;
  const limit = nValue && nValue > 0 ? Math.floor(nValue) : null;

  return withDatasetLock(datasetType, async () => {
    const { header, rows } = readArcCsv(datasetType);
    if (!header.length) {
      return createErrorResponse("Dataset file is empty.");
    }

    const ensuredHeader = ensureHeaderColumns(header, MODEL_COLUMNS.map(entry => entry.columnName));

    if (ensuredHeader !== header) {
      header.length = 0;
      header.push(...ensuredHeader);
    }

    const totalRows = rows.length;
    const runCount = limit ? Math.min(limit, totalRows) : totalRows;

    let processed = 0;
    let skipped = 0;

    for (let index = 0; index < runCount; index += 1) {
      const row = rows[index];
      const rowId = row.id ?? `row-${index + 1}`;
      const existing = row[modelConfig.columnName]?.trim();

      if (existing) {
        skipped += 1;
        logger.info({
          result: `skipped: row ${index + 1}/${runCount}`,
          datasetType,
          model: modelKey,
          rowIndex: index + 1,
          id: rowId,
        });
        continue;
      }

      const question = row.question ?? "";
      const choices = parseArcChoices(row.choices ?? "");
      const answerKey = row.answerKey ?? "";

      if (!question || !choices.length) {
        row[modelConfig.columnName] = "answer: wrong()\n" +
          "token: 0, 0, 0\n" +
          "time: 0.0s";
        processed += 1;
        writeArcCsv(datasetType, header, rows);
        continue;
      }

      const startTime = Date.now();
      const result = await generateText({
        model: getModel("qwen", modelConfig.modelName),
        prompt: buildArcPrompt(question, choices),
      });
      const elapsedSeconds = (Date.now() - startTime) / 1000;

      const prediction = extractChoiceLabel(result.text);
      const correctness = prediction === answerKey ? "right" : "wrong";
      const usage = result.usage ?? {};
      const totalTokens = usage.totalTokens ?? 0;
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;

      row[modelConfig.columnName] = formatResult({
        correctness,
        prediction,
        totalTokens,
        inputTokens,
        outputTokens,
        elapsedSeconds,
      });

      processed += 1;
      logger.info({
        result: `Completed row ${index + 1}/${runCount}`,
      });

      writeArcCsv(datasetType, header, rows);
    }

    return new Response(
      JSON.stringify({
        datasetType,
        model: modelKey,
        processed,
        skipped,
        total: runCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
}

async function withDatasetLock<T>(datasetType: ArcDatasetType, action: () => Promise<T>) {
  const current = datasetLocks.get(datasetType) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const next = new Promise<void>(resolve => {
    release = resolve;
  });
  datasetLocks.set(datasetType, current.then(() => next));
  await current;
  try {
    return await action();
  } finally {
    release();
    if (datasetLocks.get(datasetType) === next) {
      datasetLocks.delete(datasetType);
    }
  }
}

function ensureHeaderColumns(header: string[], columns: string[]) {
  const updated = [...header];
  columns.forEach(column => {
    if (!updated.includes(column)) {
      updated.push(column);
    }
  });
  return updated;
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
    `answer: ${correctness}${correctness === 'wrong' ? ` (${prediction})` : ''}`,
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
