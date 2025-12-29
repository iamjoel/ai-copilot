import fs from "node:fs";
import path from "node:path";

export type ArcDatasetType = "ARC-Challenge" | "ARC-Easy";

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
};

type CsvRow = Record<string, string>;

let cachedRecords: ArcRecord[] | null = null;

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

  return rows.map(row => {
    const choices = parseChoices(row.choices ?? "");
    return {
      id: row.id ?? "",
      question: row.question ?? "",
      choices,
      answerKey: row.answerKey ?? "",
      datasetType,
    };
  });
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

function parseChoices(value: string): ArcChoice[] {
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
