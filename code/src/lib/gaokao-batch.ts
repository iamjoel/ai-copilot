import path from "node:path";
import { generateText } from "ai";
import { getModel } from "@/lib/model-factory";
import {
  ensureHeaderColumns,
  getArcModelConfig,
  MODEL_COLUMNS,
  type BatchModelKey,
} from "@/lib/arc-batch";
import {
  getGaokaoDatasetFilePaths,
  readGaokaoCsv,
  writeGaokaoCsv,
  type CsvRow,
} from "@/lib/gaokao-dataset";
import { logger } from "@/lib/logger";

export type GaokaoBatchFileResult = {
  file: string;
  processed: number;
  skipped: number;
  total: number;
};

export type GaokaoBatchRunResult = {
  model: BatchModelKey;
  processed: number;
  skipped: number;
  total: number;
  files: GaokaoBatchFileResult[];
};

export class GaokaoBatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GaokaoBatchInputError";
  }
}

type FileState = {
  filePath: string;
  header: string[];
  rows: CsvRow[];
  runCount: number;
  processed: number;
  skipped: number;
  writeQueue: Promise<void>;
};

type GaokaoTask = {
  fileIndex: number;
  rowIndex: number;
};

export async function runGaokaoBatchAllFiles(options: {
  modelKey: BatchModelKey;
  limit: number | null;
  concurrency: number;
}): Promise<GaokaoBatchRunResult> {
  const { modelKey, limit, concurrency } = options;
  const modelConfig = getArcModelConfig(modelKey);
  if (!modelConfig) {
    throw new GaokaoBatchInputError("Unsupported model.");
  }

  const filePaths = getGaokaoDatasetFilePaths();
  if (!filePaths.length) {
    throw new GaokaoBatchInputError("No gaokao CSV files found.");
  }

  const fileStates = filePaths.map(filePath => {
    const { header, rows } = readGaokaoCsv(filePath);
    if (!header.length) {
      throw new GaokaoBatchInputError(
        `Dataset file is empty: ${path.basename(filePath)}`,
      );
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

    return {
      filePath,
      header,
      rows,
      runCount,
      processed: 0,
      skipped: 0,
      writeQueue: Promise.resolve(),
    } satisfies FileState;
  });

  const tasks: GaokaoTask[] = [];
  fileStates.forEach((state, fileIndex) => {
    for (let rowIndex = 0; rowIndex < state.runCount; rowIndex += 1) {
      tasks.push({ fileIndex, rowIndex });
    }
  });

  let processed = 0;
  let skipped = 0;

  const enqueueWrite = (state: FileState) => {
    state.writeQueue = state.writeQueue.then(() =>
      writeGaokaoCsv(state.filePath, state.header, state.rows),
    );
    return state.writeQueue;
  };

  await runWithConcurrency(
    tasks,
    Math.min(concurrency, tasks.length),
    async task => {
      const state = fileStates[task.fileIndex];
      const row = state.rows[task.rowIndex];
      const existing = row?.[modelConfig.columnName]?.trim();

      if (!row) {
        return;
      }

      if (existing) {
        state.skipped += 1;
        skipped += 1;
        logger.info(
          {
            result: `skipped: row ${task.rowIndex + 1}/${state.runCount}`,
            file: path.basename(state.filePath),
            rowIndex: task.rowIndex + 1,
          },
          "Gaokao batch",
        );
        return;
      }

      const question = row.Question ?? row.question ?? "";
      const choiceA = row.A ?? "";
      const choiceB = row.B ?? "";
      const choiceC = row.C ?? "";
      const choiceD = row.D ?? "";
      const answerKey = (row.Answer ?? row.answer ?? "").trim();

      if (!question || !choiceA || !choiceB || !choiceC || !choiceD) {
        const fallbackResult = formatFallbackResult();
        row[modelConfig.columnName] = fallbackResult;
        state.processed += 1;
        processed += 1;
        await enqueueWrite(state);
        return;
      }

      const startTime = Date.now();
      const result = await generateText({
        model: getModel(modelConfig.provider, modelConfig.modelName),
        prompt: buildGaokaoPrompt(question, choiceA, choiceB, choiceC, choiceD),
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
      state.processed += 1;
      processed += 1;

      logger.info(
        {
          result: `completed: row ${task.rowIndex + 1}/${state.runCount}`,
          file: path.basename(state.filePath),
          rowIndex: task.rowIndex + 1,
        },
        "Gaokao batch",
      );

      await enqueueWrite(state);
    },
  );

  await Promise.all(fileStates.map(state => state.writeQueue));

  const files = fileStates.map(state => ({
    file: toWorkspaceRelativePath(state.filePath),
    processed: state.processed,
    skipped: state.skipped,
    total: state.runCount,
  }));

  const total = files.reduce((sum, entry) => sum + entry.total, 0);

  return {
    model: modelKey,
    processed,
    skipped,
    total,
    files,
  };
}

function buildGaokaoPrompt(
  question: string,
  choiceA: string,
  choiceB: string,
  choiceC: string,
  choiceD: string,
) {
  return [
    "You are answering a multiple-choice question in Chinese.",
    "Pick the best answer and reply with only the option label (A, B, C, or D).",
    "",
    `Question: ${question}`,
    "Choices:",
    `A. ${choiceA}`,
    `B. ${choiceB}`,
    `C. ${choiceC}`,
    `D. ${choiceD}`,
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

function toWorkspaceRelativePath(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.split(path.sep).join("/");
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  if (!items.length) {
    return;
  }

  let cursor = 0;
  let activeCount = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      activeCount += 1;
      logger.info({ activeCount, max: limit }, "Gaokao batch concurrency");
      await worker(current);
      activeCount = Math.max(0, activeCount - 1);
      logger.info({ activeCount, max: limit }, "Gaokao batch concurrency");
    }
  });

  await Promise.all(workers);
}
