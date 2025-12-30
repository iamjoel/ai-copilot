import { generateText } from "ai";
import { getModel } from "@/lib/model-factory";
import {
  parseArcChoices,
  readArcCsv,
  type ArcChoice,
  type ArcDatasetType,
  type CsvRow,
} from "@/lib/arc-dataset";

export type BatchModelKey =
  | "qwen-flash"
  | "qwen-plus"
  | "qwen3-max"
  | "gemini-2.5-flash-lite"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-preview"
  | "claude-sonnet-4-5"
  | "claude-haiku-4-5"
  | "claude-opus-4-5";

export type ModelColumn = {
  model: BatchModelKey;
  provider: "qwen" | "anthropic" | "google";
  columnName: string;
  modelName: string;
};

export const MODEL_COLUMNS: ModelColumn[] = [
  {
    model: "qwen-flash",
    provider: "qwen",
    columnName: "Qwen Flash",
    modelName: "qwen-flash",
  },
  {
    model: "qwen-plus",
    provider: "qwen",
    columnName: "Qwen Plus",
    modelName: "qwen-plus",
  },
  {
    model: "qwen3-max",
    provider: "qwen",
    columnName: "Qwen3 max",
    modelName: "qwen3-max",
  },
  {
    model: "gemini-2.5-flash-lite",
    provider: "google",
    columnName: "Gemini 2.5 Flash Lite",
    modelName: "models/gemini-2.5-flash-lite",
  },
  {
    model: "gemini-3-flash-preview",
    provider: "google",
    columnName: "Gemini 3 Flash",
    modelName: "models/gemini-3-flash-preview",
  },
  {
    model: "gemini-3-pro-preview",
    provider: "google",
    columnName: "Gemini 3 Pro",
    modelName: "models/gemini-3-pro-preview",
  },
  {
    model: "claude-sonnet-4-5",
    provider: "anthropic",
    columnName: "Claude Sonnet 4.5",
    modelName: "claude-sonnet-4-5",
  },
  {
    model: "claude-haiku-4-5",
    provider: "anthropic",
    columnName: "Claude Haiku 4.5",
    modelName: "claude-haiku-4-5",
  },
  {
    model: "claude-opus-4-5",
    provider: "anthropic",
    columnName: "Claude Opus 4.5",
    modelName: "claude-opus-4-5",
  },
];

export type ArcBatchContext = {
  datasetType: ArcDatasetType;
  modelKey: BatchModelKey;
  modelConfig: ModelColumn;
  header: string[];
  rows: CsvRow[];
  total: number;
};

export type ArcBatchRowResult = {
  rowIndex: number;
  rowId: string;
  result: string;
  prediction: string;
  correctness: "right" | "wrong";
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  elapsedSeconds: number;
};

export type ArcBatchRowSkip = {
  rowIndex: number;
  rowId: string;
};

export type ArcBatchRunResult = ArcBatchContext & {
  processed: number;
  skipped: number;
};

export type ArcBatchHandlers = {
  onRowResult?: (
    info: ArcBatchRowResult,
    context: ArcBatchContext,
  ) => void | Promise<void>;
  onRowSkip?: (info: ArcBatchRowSkip, context: ArcBatchContext) => void;
};

export class ArcBatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArcBatchInputError";
  }
}

export function getArcModelConfig(modelKey: BatchModelKey) {
  return MODEL_COLUMNS.find(entry => entry.model === modelKey) ?? null;
}

export function ensureHeaderColumns(header: string[], columns: string[]) {
  const updated = [...header];
  columns.forEach(column => {
    if (!updated.includes(column)) {
      updated.push(column);
    }
  });
  return updated;
}

export async function runArcBatch(options: {
  datasetType: ArcDatasetType;
  modelKey: BatchModelKey;
  limit: number | null;
  handlers?: ArcBatchHandlers;
}): Promise<ArcBatchRunResult> {
  const { datasetType, modelKey, limit, handlers } = options;
  const modelConfig = getArcModelConfig(modelKey);
  if (!modelConfig) {
    throw new ArcBatchInputError("Unsupported model.");
  }

  const { header, rows } = readArcCsv(datasetType);
  if (!header.length) {
    throw new ArcBatchInputError("Dataset file is empty.");
  }

  const ensuredHeader = ensureHeaderColumns(
    header,
    MODEL_COLUMNS.map(entry => entry.columnName),
  );

  if (ensuredHeader !== header) {
    header.length = 0;
    header.push(...ensuredHeader);
  }

  const totalRows = rows.length;
  const runCount = limit ? Math.min(limit, totalRows) : totalRows;

  const context: ArcBatchContext = {
    datasetType,
    modelKey,
    modelConfig,
    header,
    rows,
    total: runCount,
  };

  let processed = 0;
  let skipped = 0;

  for (let index = 0; index < runCount; index += 1) {
    const row = rows[index];
    const rowId = row.id ?? `row-${index + 1}`;
    const existing = row[modelConfig.columnName]?.trim();

    if (existing) {
      skipped += 1;
      handlers?.onRowSkip?.({ rowIndex: index + 1, rowId }, context);
      continue;
    }

    const question = row.question ?? "";
    const choices = parseArcChoices(row.choices ?? "");
    const answerKey = row.answerKey ?? "";

    if (!question || !choices.length) {
      const fallbackResult = formatFallbackResult();
      row[modelConfig.columnName] = fallbackResult;
      processed += 1;
      await handlers?.onRowResult?.(
        {
          rowIndex: index + 1,
          rowId,
          result: fallbackResult,
          prediction: "",
          correctness: "wrong",
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          elapsedSeconds: 0,
        },
        context,
      );
      continue;
    }

    const startTime = Date.now();
    const result = await generateText({
      model: getModel(modelConfig.provider, modelConfig.modelName),
      prompt: buildArcPrompt(question, choices),
    });
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    const prediction = extractChoiceLabel(result.text);
    const correctness = prediction === answerKey ? "right" : "wrong";
    const usage = result.usage ?? {};
    const totalTokens = usage.totalTokens ?? 0;
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;

    const formatted = formatResult({
      correctness,
      prediction,
      totalTokens,
      inputTokens,
      outputTokens,
      elapsedSeconds,
    });

    row[modelConfig.columnName] = formatted;
    processed += 1;

    await handlers?.onRowResult?.(
      {
        rowIndex: index + 1,
        rowId,
        result: formatted,
        prediction,
        correctness,
        totalTokens,
        inputTokens,
        outputTokens,
        elapsedSeconds,
      },
      context,
    );
  }

  return {
    ...context,
    processed,
    skipped,
  };
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

function formatFallbackResult() {
  return "answer: wrong()\n" + "token: 0, 0, 0\n" + "time: 0.0s";
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
    `answer: ${correctness}${
      correctness === "wrong" ? ` (${prediction})` : ""
    }`,
    `token: ${totalTokens}, ${inputTokens}, ${outputTokens}`,
    `time: ${elapsedSeconds.toFixed(1)}s`,
  ].join("\n");
}
