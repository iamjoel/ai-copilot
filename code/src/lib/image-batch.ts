import fs from "node:fs";
import path from "node:path";

export type CsvRow = Record<string, string>;

export type CsvData = {
  header: string[];
  rows: CsvRow[];
};

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "src/data/image-batch");
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "outputs/image-batch");
const DEFAULT_CSV_FILE = "requests.csv";

const fileLocks = new Map<string, Promise<void>>();

export function getImageBatchCsvPath(fileName?: string) {
  const safeName = sanitizeCsvFileName(fileName ?? DEFAULT_CSV_FILE);
  return path.join(DEFAULT_DATA_DIR, safeName);
}

export function getImageBatchOutputDir() {
  return DEFAULT_OUTPUT_DIR;
}

export function ensureImageBatchDirectories() {
  fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
  fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
}

export function readImageBatchCsv(filePath: string): CsvData {
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

export function writeImageBatchCsv(filePath: string, header: string[], rows: CsvRow[]) {
  const content = serializeCsv(header, rows);
  fs.writeFileSync(filePath, content, "utf-8");
}

export async function withCsvLock<T>(filePath: string, action: () => Promise<T>) {
  const current = fileLocks.get(filePath) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const next = new Promise<void>(resolve => {
    release = resolve;
  });
  fileLocks.set(filePath, current.then(() => next));
  await current;
  try {
    return await action();
  } finally {
    release();
    if (fileLocks.get(filePath) === next) {
      fileLocks.delete(filePath);
    }
  }
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

export function sanitizeCsvFileName(value: string) {
  const name = path.basename(value.trim());
  if (!name.toLowerCase().endsWith(".csv")) {
    return DEFAULT_CSV_FILE;
  }
  return name;
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
