import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import type { ArcDatasetType } from "@/lib/arc-dataset";
import type { BatchModelKey } from "@/lib/arc-batch";

export type ArcBatchDbRecord = {
  moduleName: string;
  datasetType: ArcDatasetType;
  modelKey: BatchModelKey;
  rowIndex: number;
  rowId: string;
  result: string;
};

export type ArcBatchDbRow = {
  rowIndex: number;
  result: string;
};

export const ARC_BATCH_MODULE_NAME = "arc/run/batch";

let cachedClient: Client | null = null;

export function getLibSqlClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "arc-batch-results.db");
  const url = `file:${dbPath}`;
  cachedClient = createClient({ url });
  return cachedClient;
}

export async function ensureArcBatchTable(client: Client) {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS arc_batch_results (" +
      "module_name TEXT NOT NULL," +
      "dataset_type TEXT NOT NULL," +
      "model TEXT NOT NULL," +
      "row_index INTEGER NOT NULL," +
      "row_id TEXT NOT NULL," +
      "result TEXT NOT NULL," +
      "updated_at TEXT NOT NULL," +
      "PRIMARY KEY (module_name, dataset_type, model, row_index)" +
      ")",
  );

  await client.execute(
    "CREATE INDEX IF NOT EXISTS arc_batch_results_updated_idx " +
      "ON arc_batch_results (module_name, dataset_type, model, updated_at)",
  );
}

export async function upsertArcBatchResult(
  client: Client,
  record: ArcBatchDbRecord,
) {
  await client.execute({
    sql:
      "INSERT INTO arc_batch_results (" +
      "module_name, dataset_type, model, row_index, row_id, result, updated_at" +
      ") VALUES (?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(module_name, dataset_type, model, row_index) DO UPDATE SET " +
      "row_id = excluded.row_id, result = excluded.result, updated_at = excluded.updated_at",
    args: [
      record.moduleName,
      record.datasetType,
      record.modelKey,
      record.rowIndex,
      record.rowId,
      record.result,
      new Date().toISOString(),
    ],
  });
}

export async function fetchArcBatchResults(
  client: Client,
  moduleName: string,
  datasetType: ArcDatasetType,
  modelKey: BatchModelKey,
) {
  const result = await client.execute({
    sql: "SELECT row_index, result FROM arc_batch_results WHERE module_name = ? AND dataset_type = ? AND model = ?",
    args: [moduleName, datasetType, modelKey],
  });

  return (result.rows ?? []).map(row => {
    const rowIndex = Number((row as Record<string, unknown>).row_index ?? 0);
    const resultText = String((row as Record<string, unknown>).result ?? "");
    return { rowIndex, result: resultText } satisfies ArcBatchDbRow;
  });
}
