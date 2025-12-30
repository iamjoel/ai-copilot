import fs from "node:fs";
import path from "node:path";

export type ArcDatasetType = "ARC-Challenge" | "ARC-Easy";
export type ArcModelKey = "qwen-flash" | "qwen-plus" | "qwen3-max";

export const QWEN_RESULT_COLUMNS: Record<ArcModelKey, string> = {
  "qwen-flash": "Qwen Flash",
  "qwen-plus": "Qwen Plus",
  "qwen3-max": "Qwen3 max",
};

export type ArcChoice = {
  label: string;
  text: string;
};

export type ArcRecord = {
  id: string;
  question: string;
  choices: ArcChoice[];
  answerKey: string;
  datasetType: ArcDatasetType;
  qwenFlashResult?: string;
  qwenPlusResult?: string;
  qwen3MaxResult?: string;
};

export type CsvRow = Record<string, string>;

export type ArcCsvData = {
  header: string[];
  rows: CsvRow[];
};

let cachedRecords: ArcRecord[] | null = null;
const datasetLocks = new Map<ArcDatasetType, Promise<void>>();

export function loadArcDatasets(): ArcRecord[] {
  if (cachedRecords) {
    return cachedRecords;
  }

  const challenge = loadCsvFile("ARC-Challenge_test.csv", "ARC-Challenge");
  const easy = loadCsvFile("ARC-Easy_test.csv", "ARC-Easy");

  cachedRecords = [...challenge, ...easy];
  return cachedRecords;
}

function loadCsvFile(fileName: string, datasetType: ArcDatasetType): ArcRecord[] {
  const filePath = path.resolve(process.cwd(), "src/data/ai2 arc", fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCsv(content);

  return rows.map(row => buildArcRecord(row, datasetType));
}

export function getArcDatasetFilePath(datasetType: ArcDatasetType) {
  const fileName =
    datasetType === "ARC-Challenge" ? "ARC-Challenge_test.csv" : "ARC-Easy_test.csv";
  return path.resolve(process.cwd(), "src/data/ai2 arc", fileName);
}

export function readArcCsv(datasetType: ArcDatasetType): ArcCsvData {
  const filePath = getArcDatasetFilePath(datasetType);
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCsvRows(content);
  if (!rows.length) {
    return { header: [], rows: [] };
  }
  const [header, ...dataRows] = rows;
  const records = dataRows
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row => {
      const record: CsvRow = {};
      header.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      return record;
    });
  return { header, rows: records };
}

export function writeArcCsv(datasetType: ArcDatasetType, header: string[], rows: CsvRow[]) {
  const filePath = getArcDatasetFilePath(datasetType);
  const content = serializeCsv(header, rows);
  fs.writeFileSync(filePath, content, "utf-8");
}

export async function withDatasetLock<T>(datasetType: ArcDatasetType, action: () => Promise<T>) {
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

function parseCsv(content: string): CsvRow[] {
  const rows = parseCsvRows(content);
  if (!rows.length) {
    return [];
  }

  const [header, ...dataRows] = rows;
  return dataRows
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row => {
      const record: CsvRow = {};
      header.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      return record;
    });
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === "\r") {
      continue;
    }

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function serializeCsv(header: string[], rows: CsvRow[]) {
  const lines = [
    header.map(escapeCsvValue).join(","),
    ...rows.map(row => header.map(key => escapeCsvValue(row[key] ?? "")).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

function escapeCsvValue(value: string) {
  if (value.includes("\"")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  if (value.includes(",") || value.includes("\n")) {
    return `"${value}"`;
  }
  return value;
}

export function parseArcChoices(value: string): ArcChoice[] {
  const textItems = extractArrayValues(value, "text");
  const labelItems = extractArrayValues(value, "label");

  if (!textItems.length) {
    return [];
  }

  const labels = labelItems.length === textItems.length
    ? labelItems
    : textItems.map((_, index) => String.fromCharCode(65 + index));

  return textItems.map((text, index) => ({
    label: labels[index] ?? String.fromCharCode(65 + index),
    text,
  }));
}

export function buildArcRecord(row: CsvRow, datasetType: ArcDatasetType): ArcRecord {
  const choices = parseArcChoices(row.choices ?? "");
  return {
    id: row.id ?? "",
    question: row.question ?? "",
    choices,
    answerKey: row.answerKey ?? "",
    datasetType,
    qwenFlashResult: row[QWEN_RESULT_COLUMNS["qwen-flash"]] ?? "",
    qwenPlusResult: row[QWEN_RESULT_COLUMNS["qwen-plus"]] ?? "",
    qwen3MaxResult: row[QWEN_RESULT_COLUMNS["qwen3-max"]] ?? "",
  };
}

function extractArrayValues(value: string, key: "text" | "label"): string[] {
  const pattern = new RegExp(`'${key}'\\s*:\\s*array\\((\\[[\\s\\S]*?\\])`, "i");
  const match = value.match(pattern);
  if (!match?.[1]) {
    return [];
  }

  const items: string[] = [];
  const listText = match[1];
  const regex = /'([^']*)'|"([^"]*)"/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = regex.exec(listText)) !== null) {
    items.push(itemMatch[1] ?? itemMatch[2] ?? "");
  }

  return items;
}
