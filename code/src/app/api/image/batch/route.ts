import fs from "node:fs";
import path from "node:path";
import { z } from "zod/v3";
import { GoogleGenAI } from "@google/genai";
import checkInput from "@/app/api/utils/check-input";
import { logger } from "@/lib/logger";
import {
  ensureHeaderColumns,
  ensureImageBatchDirectories,
  getImageBatchCsvPath,
  getImageBatchOutputDir,
  readImageBatchCsv,
  writeImageBatchCsv,
  withCsvLock,
  type CsvRow,
} from "@/lib/image-batch";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  n: z.number().int().positive().optional(),
  inputFile: z.string().trim().min(1).optional(),
});

type Params = z.infer<typeof ParamsSchema>;

type BatchResult = {
  processed: number;
  skipped: number;
  total: number;
  inputFile: string;
};

const REQUIRED_COLUMNS = ["input", "output", "status", "error"];
const DEFAULT_MODEL = "gemini-2.5-flash-image"; // Nano Banana
// const DEFAULT_MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = await req.json();
    const { isValid, response, data } = checkInput(body, ParamsSchema);
    if (!isValid) {
      return response;
    }

    const { n, inputFile } = data as Params;
    ensureImageBatchDirectories();

    const csvPath = getImageBatchCsvPath(inputFile);

    const result = await withCsvLock(csvPath, async () =>
      runBatch(csvPath, n ?? null),
    );

    return Response.json(result);
  } catch (error) {
    if (error instanceof BatchInputError) {
      logger.error({ error }, "Image batch input error");
      return Response.json({ error: error.message }, { status: 400 });
    }
    logger.error({ error }, "Image batch error");
    return Response.json(
      { error: "Unable to run image batch right now." },
      { status: 500 },
    );
  }
}

async function runBatch(csvPath: string, limit: number | null): Promise<BatchResult> {
  if (!fs.existsSync(csvPath)) {
    throw new BatchInputError("CSV file not found.");
  }

  const { header, rows } = readImageBatchCsv(csvPath);
  if (!header.length) {
    throw new BatchInputError("Dataset file is empty.");
  }

  if (!header.includes("input")) {
    throw new BatchInputError("Missing required column: input.");
  }

  const ensuredHeader = ensureHeaderColumns(header, REQUIRED_COLUMNS);
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
    const existing = row.output?.trim();

    if (existing) {
      skipped += 1;
      logger.info({
        result: `skipped: row ${index + 1}/${runCount}`,
        rowIndex: index + 1,
      });
      continue;
    }

    const input = row.input?.trim() ?? "";
    if (!input) {
      updateRow(row, {
        status: "error",
        error: "Missing input prompt.",
      });
      processed += 1;
      writeImageBatchCsv(csvPath, header, rows);
      continue;
    }

    try {
      const outputPath = buildOutputPath(index + 1);
      await generateImage(input, outputPath);
      updateRow(row, {
        output: toWorkspaceRelativePath(outputPath),
        status: "done",
        error: "",
      });
      processed += 1;
      logger.info({
        result: `completed: row ${index + 1}/${runCount}`,
        rowIndex: index + 1,
        output: row.output,
      });
    } catch (error) {
      updateRow(row, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      processed += 1;
      logger.error({
        error,
        result: `failed: row ${index + 1}/${runCount}`,
        rowIndex: index + 1,
      });
    }

    writeImageBatchCsv(csvPath, header, rows);
  }

  return {
    processed,
    skipped,
    total: runCount,
    inputFile: path.relative(process.cwd(), csvPath),
  };
}

function updateRow(row: CsvRow, next: Partial<CsvRow>) {
  Object.assign(row, next);
}

async function generateImage(prompt: string, outputPath: string) {
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const firstInline = parts.find(part => !!part.inlineData)?.inlineData;
  if (!firstInline?.data) {
    throw new Error("No image data returned by provider.");
  }

  const buffer = Buffer.from(firstInline.data, "base64");
  fs.writeFileSync(outputPath, buffer);
}

function buildOutputPath(rowIndex: number) {
  const outputDir = getImageBatchOutputDir();
  const timestamp = Date.now();
  const filename = `image-${rowIndex}-${timestamp}.png`;
  return path.join(outputDir, filename);
}

function toWorkspaceRelativePath(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.split(path.sep).join("/");
}

class BatchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchInputError";
  }
}
