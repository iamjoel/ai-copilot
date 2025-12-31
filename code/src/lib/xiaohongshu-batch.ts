import fs from "node:fs";
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
  getXiaohongshuDatasetFilePaths,
  readXiaohongshuCsv,
  writeXiaohongshuCsv,
  type CsvRow,
} from "@/lib/xiaohongshu-dataset";
import { logger } from "@/lib/logger";

export type XiaohongshuBatchFileResult = {
  file: string;
  processed: number;
  skipped: number;
  total: number;
};

export type XiaohongshuBatchRunResult = {
  model: BatchModelKey;
  processed: number;
  skipped: number;
  total: number;
  files: XiaohongshuBatchFileResult[];
};

export class XiaohongshuBatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XiaohongshuBatchInputError";
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

type XiaohongshuTask = {
  fileIndex: number;
  rowIndex: number;
};

type PromptInput = {
  scenario: string;
  product: string;
  targetUser: string;
  goal: string;
  tone: string;
  length: string;
  mustInclude: string;
  avoid: string;
  callToAction: string;
  hashtags: string;
  notes: string;
};

const OUTPUT_DIR = path.resolve(process.cwd(), "src/data/xiaohongshu/generated");

export async function runXiaohongshuBatchAllFiles(options: {
  modelKey: BatchModelKey;
  limit: number | null;
  concurrency: number;
}): Promise<XiaohongshuBatchRunResult> {
  const { modelKey, limit, concurrency } = options;
  const modelConfig = getArcModelConfig(modelKey);
  if (!modelConfig) {
    throw new XiaohongshuBatchInputError("Unsupported model.");
  }

  const filePaths = getXiaohongshuDatasetFilePaths();
  if (!filePaths.length) {
    throw new XiaohongshuBatchInputError("No xiaohongshu CSV files found.");
  }

  const fileStates = filePaths.map(filePath => {
    const { header, rows } = readXiaohongshuCsv(filePath);
    if (!header.length) {
      throw new XiaohongshuBatchInputError(
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

  const tasks: XiaohongshuTask[] = [];
  fileStates.forEach((state, fileIndex) => {
    for (let rowIndex = 0; rowIndex < state.runCount; rowIndex += 1) {
      tasks.push({ fileIndex, rowIndex });
    }
  });

  let processed = 0;
  let skipped = 0;

  const enqueueWrite = (state: FileState) => {
    state.writeQueue = state.writeQueue.then(() =>
      writeXiaohongshuCsv(state.filePath, state.header, state.rows),
    );
    return state.writeQueue;
  };

  const outputBaseDir = path.join(OUTPUT_DIR, modelKey);
  fs.mkdirSync(outputBaseDir, { recursive: true });

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
          "Xiaohongshu batch",
        );
        return;
      }

      const input = buildPromptInput(row);
      if (!isPromptInputValid(input)) {
        const fallbackResult = formatFallbackResult();
        row[modelConfig.columnName] = fallbackResult;
        state.processed += 1;
        processed += 1;
        await enqueueWrite(state);
        return;
      }

      const generationStart = Date.now();
      const generationResult = await generateText({
        model: getModel(modelConfig.provider, modelConfig.modelName),
        prompt: buildXiaohongshuPrompt(input),
      });
      const generationElapsed = (Date.now() - generationStart) / 1000;

      const content = generationResult.text.trim();
      const outputFile = path.join(outputBaseDir, `${toSafeFileName(row.id, task.rowIndex)}.md`);
      fs.writeFileSync(outputFile, `${content}\n`, "utf-8");

      const scoreStart = Date.now();
      const scoreResult = await generateText({
        model: getModel('google', 'models/gemini-2.5-pro'),
        prompt: buildScorePrompt(input, content),
      });
      const scoreElapsed = (Date.now() - scoreStart) / 1000;

      const scoreValue = extractScore(scoreResult.text);

      const generationUsage = generationResult.usage ?? {};
      const scoreUsage = scoreResult.usage ?? {};
      const totalTokens = (generationUsage.totalTokens ?? 0) + (scoreUsage.totalTokens ?? 0);
      const inputTokens = (generationUsage.inputTokens ?? 0) + (scoreUsage.inputTokens ?? 0);
      const outputTokens = (generationUsage.outputTokens ?? 0) + (scoreUsage.outputTokens ?? 0);
      const elapsedSeconds = generationElapsed + scoreElapsed;

      const formatted = formatResult({
        totalTokens,
        inputTokens,
        outputTokens,
        elapsedSeconds,
        score: scoreValue,
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
        "Xiaohongshu batch",
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

function buildPromptInput(row: CsvRow): PromptInput {
  return {
    scenario: (row.scenario ?? "").trim(),
    product: (row.product ?? "").trim(),
    targetUser: (row.targetUser ?? "").trim(),
    goal: (row.goal ?? "").trim(),
    tone: (row.tone ?? "").trim(),
    length: (row.length ?? "").trim(),
    mustInclude: (row.mustInclude ?? "").trim(),
    avoid: (row.avoid ?? "").trim(),
    callToAction: (row.callToAction ?? "").trim(),
    hashtags: (row.hashtags ?? "").trim(),
    notes: (row.notes ?? "").trim(),
  };
}

function isPromptInputValid(input: PromptInput) {
  return Boolean(input.scenario && input.product && input.targetUser && input.goal);
}

function buildXiaohongshuPrompt(input: PromptInput) {
  const lines = [
    "You are a Xiaohongshu (Little Red Book) content creator.",
    "Write in Simplified Chinese.",
    "Keep the tone authentic, friendly, and helpful.",
    "Follow the requirements and avoid medical or exaggerated claims.",
    "",
    `Scenario: ${input.scenario}`,
    `Product/Topic: ${input.product}`,
    `Target user: ${input.targetUser}`,
    `Goal: ${input.goal}`,
    `Tone: ${input.tone || "natural"}`,
    `Target length: ${input.length || "160-220 Chinese characters"}`,
    `Must include: ${input.mustInclude || "none"}`,
    `Avoid: ${input.avoid || "none"}`,
    `Call to action: ${input.callToAction || "none"}`,
    `Hashtags: ${input.hashtags || "none"}`,
    input.notes ? `Notes: ${input.notes}` : null,
    "",
    "Output format in Markdown:",
    "- First line starts with '# ' and is a catchy title.",
    "- 2-4 short paragraphs.",
    "- If suitable, include a short bullet list (3-6 items).",
    "- End with a single line of hashtags (5-8 tags).",
    "Return only the markdown content.",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildScorePrompt(input: PromptInput, content: string) {
  return [
    "You are a strict evaluator for Xiaohongshu copy.",
    "Score from 1 to 10 with one decimal.",
    "Evaluate relevance to scenario/product/target/goal, clarity, authenticity, platform fit,",
    "compliance with must-include/avoid/length, and call-to-action quality.",
    "Return only a number like 8.7.",
    "",
    `Scenario: ${input.scenario}`,
    `Product/Topic: ${input.product}`,
    `Target user: ${input.targetUser}`,
    `Goal: ${input.goal}`,
    `Tone: ${input.tone}`,
    `Target length: ${input.length}`,
    `Must include: ${input.mustInclude}`,
    `Avoid: ${input.avoid}`,
    `Call to action: ${input.callToAction}`,
    "",
    "Copy:",
    content,
  ].join("\n");
}

function extractScore(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  const raw = match ? Number.parseFloat(match[1]) : 0;
  if (Number.isNaN(raw)) {
    return 0;
  }
  return Math.min(10, Math.max(0, raw));
}

function formatFallbackResult() {
  return "token: 0, 0, 0\n" + "time: 0.0s\n" + "score: 0.0/10";
}

function formatResult(options: {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  elapsedSeconds: number;
  score: number;
}) {
  const { totalTokens, inputTokens, outputTokens, elapsedSeconds, score } = options;
  return [
    `token: ${totalTokens}, ${inputTokens}, ${outputTokens}`,
    `time: ${elapsedSeconds.toFixed(1)}s`,
    `score: ${score.toFixed(1)}/10`,
  ].join("\n");
}

function toSafeFileName(rowId: string | undefined, rowIndex: number) {
  const base = rowId?.trim() || `row-${rowIndex + 1}`;
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : `row-${rowIndex + 1}`;
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
        "Xiaohongshu batch concurrency",
      );
      await worker(current);
      activeCount = Math.max(0, activeCount - 1);
      logger.info(
        { activeCount, max: limit },
        "Xiaohongshu batch concurrency",
      );
    }
  });

  await Promise.all(workers);
}
