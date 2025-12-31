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
  getCollectionContinueWritingFilePaths,
  readCollectionContinueWritingCsv,
  writeCollectionContinueWritingCsv,
  type CsvRow,
} from "@/lib/collection-continue-writing-dataset";
import { logger } from "@/lib/logger";

export type CollectionContinueWritingFileResult = {
  file: string;
  processed: number;
  skipped: number;
  total: number;
};

export type CollectionContinueWritingRunResult = {
  model: BatchModelKey;
  processed: number;
  skipped: number;
  total: number;
  files: CollectionContinueWritingFileResult[];
};

export class CollectionContinueWritingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionContinueWritingInputError";
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
  inputColumns: string[];
};

type CollectionTask = {
  fileIndex: number;
  rowIndex: number;
};

export async function runCollectionContinueWritingAllFiles(options: {
  modelKey: BatchModelKey;
  limit: number | null;
  concurrency: number;
}): Promise<CollectionContinueWritingRunResult> {
  const { modelKey, limit, concurrency } = options;
  const modelConfig = getArcModelConfig(modelKey);
  if (!modelConfig) {
    throw new CollectionContinueWritingInputError("Unsupported model.");
  }

  const filePaths = getCollectionContinueWritingFilePaths();
  if (!filePaths.length) {
    throw new CollectionContinueWritingInputError("No collection CSV files found.");
  }

  const fileStates = filePaths.map(filePath => {
    const { header, rows } = readCollectionContinueWritingCsv(filePath);
    if (!header.length) {
      throw new CollectionContinueWritingInputError(
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

    const modelColumns = new Set(MODEL_COLUMNS.map(entry => entry.columnName));
    const inputColumns = header.filter(name => !modelColumns.has(name));

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
      inputColumns,
    } satisfies FileState;
  });

  const tasks: CollectionTask[] = [];
  fileStates.forEach((state, fileIndex) => {
    for (let rowIndex = 0; rowIndex < state.runCount; rowIndex += 1) {
      tasks.push({ fileIndex, rowIndex });
    }
  });

  let processed = 0;
  let skipped = 0;

  const enqueueWrite = (state: FileState) => {
    state.writeQueue = state.writeQueue.then(() =>
      writeCollectionContinueWritingCsv(state.filePath, state.header, state.rows),
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
          "Collection continue writing batch",
        );
        return;
      }

      const inputBlocks = state.inputColumns
        .map(column => ({
          column,
          value: row[column]?.trim() ?? "",
        }))
        .filter(entry => entry.value.length > 0);

      if (!inputBlocks.length) {
        const fallbackResult = formatFallbackResult();
        row[modelConfig.columnName] = fallbackResult;
        state.processed += 1;
        processed += 1;
        await enqueueWrite(state);
        return;
      }

      const startTime = Date.now();
      const completions: string[] = [];
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      for (const entry of inputBlocks) {
        const result = await generateText({
          model: getModel(modelConfig.provider, modelConfig.modelName),
          prompt: buildContinuePrompt(entry.value),
        });
        completions.push(formatContinuation(entry.column, result.text.trim()));
        const usage = result.usage ?? {};
        totalTokens += usage.totalTokens ?? 0;
        inputTokens += usage.inputTokens ?? 0;
        outputTokens += usage.outputTokens ?? 0;
      }

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      const formatted = formatResult({
        continuations: completions,
        elapsedSeconds,
        totalTokens,
        inputTokens,
        outputTokens,
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
        "Collection continue writing batch",
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

function buildContinuePrompt(text: string) {
  return [
    "Continue writing the following Chinese text.",
    "Reply with only the continuation, no explanations.",
    "",
    text,
    "",
    "Continuation:",
  ].join("\n");
}

function formatContinuation(column: string, continuation: string) {
  return `${column}:\n${continuation}`;
}

function formatFallbackResult() {
  return "answer: wrong()\n" + "token: 0, 0, 0\n" + "time: 0.0s";
}

function formatResult(options: {
  continuations: string[];
  elapsedSeconds: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}) {
  const { continuations, elapsedSeconds, totalTokens, inputTokens, outputTokens } = options;
  return [
    "answer: done",
    continuations.join("\n\n---\n\n"),
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
      logger.info(
        { activeCount, max: limit },
        "Collection continue writing batch concurrency",
      );
      await worker(current);
      activeCount = Math.max(0, activeCount - 1);
      logger.info(
        { activeCount, max: limit },
        "Collection continue writing batch concurrency",
      );
    }
  });

  await Promise.all(workers);
}
