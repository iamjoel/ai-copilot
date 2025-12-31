import fs from "node:fs";
import path from "node:path";

export type CsvRow = Record<string, string>;

export type CustomCsvData = {
  header: string[];
  rows: CsvRow[];
};

const CUSTOM_DIR = path.resolve(process.cwd(), "src/data/custom");

let customLock: Promise<void> | null = null;

export function getCustomDatasetFilePaths(): string[] {
  if (!fs.existsSync(CUSTOM_DIR)) {
    return [];
  }

  return fs
    .readdirSync(CUSTOM_DIR)
    .filter(entry => entry.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b))
    .map(entry => path.join(CUSTOM_DIR, entry));
}

export function readCustomCsv(filePath: string): CustomCsvData {
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

export function writeCustomCsv(filePath: string, header: string[], rows: CsvRow[]) {
  const content = serializeCsv(header, rows);
  fs.writeFileSync(filePath, content, "utf-8");
}

export async function withCustomLock<T>(action: () => Promise<T>) {
  const current = customLock ?? Promise.resolve();
  let release: () => void = () => undefined;
  const next = new Promise<void>(resolve => {
    release = resolve;
  });

  customLock = current.then(() => next);
  await current;

  try {
    return await action();
  } finally {
    release();
    if (customLock === next) {
      customLock = null;
    }
  }
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
