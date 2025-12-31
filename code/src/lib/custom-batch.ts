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
  getCustomDatasetFilePaths,
  readCustomCsv,
  writeCustomCsv,
  type CsvRow,
} from "@/lib/custom-dataset";
import { logger } from "@/lib/logger";

export type CustomBatchFileResult = {
  file: string;
  processed: number;
  skipped: number;
  total: number;
};

export type CustomBatchRunResult = {
  model: BatchModelKey;
  processed: number;
  skipped: number;
  total: number;
  files: CustomBatchFileResult[];
};

export class CustomBatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomBatchInputError";
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

type CustomTask = {
  fileIndex: number;
  rowIndex: number;
};

export async function runCustomBatchAllFiles(options: {
  modelKey: BatchModelKey;
  limit: number | null;
  concurrency: number;
}): Promise<CustomBatchRunResult> {
  const { modelKey, limit, concurrency } = options;
  const modelConfig = getArcModelConfig(modelKey);
  if (!modelConfig) {
    throw new CustomBatchInputError("Unsupported model.");
  }

  const filePaths = getCustomDatasetFilePaths();
  if (!filePaths.length) {
    throw new CustomBatchInputError("No custom CSV files found.");
  }

  const fileStates = filePaths.map(filePath => {
    const { header, rows } = readCustomCsv(filePath);
    if (!header.length) {
      throw new CustomBatchInputError(
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

  const tasks: CustomTask[] = [];
  fileStates.forEach((state, fileIndex) => {
    for (let rowIndex = 0; rowIndex < state.runCount; rowIndex += 1) {
      tasks.push({ fileIndex, rowIndex });
    }
  });

  let processed = 0;
  let skipped = 0;

  const enqueueWrite = (state: FileState) => {
    state.writeQueue = state.writeQueue.then(() =>
      writeCustomCsv(state.filePath, state.header, state.rows),
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
          "Custom batch",
        );
        return;
      }

      const question = row.question ?? row.Question ?? "";
      const answerKey = (row.answer ?? row.Answer ?? "").trim();

      if (!question) {
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
        prompt: buildCompletionPrompt(question),
      });
      const elapsedSeconds = (Date.now() - startTime) / 1000;

      const prediction = result.text.trim();
      const correctness = answerKey && prediction === answerKey ? "right" : "wrong";
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
        "Custom batch",
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

function buildCompletionPrompt(question: string) {
  return [
    "You are answering a short-answer question in Chinese.",
    "Reply with only the final answer, without explanation.",
    "",
    `Question: ${question}`,
    "",
    "Answer:",
  ].join("\n");
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
      logger.info({ activeCount, max: limit }, "Custom batch concurrency");
      await worker(current);
      activeCount = Math.max(0, activeCount - 1);
      logger.info({ activeCount, max: limit }, "Custom batch concurrency");
    }
  });

  await Promise.all(workers);
}
