import { logger } from "@/lib/logger";
import {
  withDatasetLock,
  writeArcCsv,
  type ArcDatasetType,
} from "@/lib/arc-dataset";
import {
  ArcBatchInputError,
  getArcModelConfig,
  runArcBatch,
  type BatchModelKey,
} from "@/lib/arc-batch";
import {
  ARC_BATCH_MODULE_NAME,
  ensureArcBatchTable,
  fetchArcBatchResults,
  getLibSqlClient,
  upsertArcBatchResult,
} from "@/lib/arc-batch-libsql";

export const runtime = "nodejs";

type BatchRunRequest = {
  n?: number;
  model?: BatchModelKey;
  datasetType?: ArcDatasetType;
};

let activeCount = 0;

async function withConcurrencyLogging<T>(
  action: () => Promise<T>,
  context: { method: string },
): Promise<T> {
  activeCount += 1;
  logger.info({ activeCount, method: context.method }, "Arc batch concurrency");

  try {
    return await action();
  } finally {
    activeCount = Math.max(0, activeCount - 1);
    logger.info(
      { activeCount, method: context.method },
      "Arc batch concurrency",
    );
  }
}

export async function POST(request: Request) {
  return withConcurrencyLogging(async () => {
    const body = (await request.json()) as BatchRunRequest;
    const datasetType = body.datasetType;
    const modelKey = body.model;

    if (!datasetType) {
      return createErrorResponse("Missing datasetType.");
    }

    if (!modelKey) {
      return createErrorResponse("Missing model.");
    }

    if (!getArcModelConfig(modelKey)) {
      return createErrorResponse("Unsupported model.");
    }

    const nValue = body.n;
    const limit = nValue && nValue > 0 ? Math.floor(nValue) : null;

    return withDatasetLock(datasetType, async () => {
      try {
        const result = await runArcBatch({
          datasetType,
          modelKey,
          limit,
          handlers: {
            onRowSkip(info, context) {
              logger.info({
                result: `skipped: row ${info.rowIndex}/${context.total}`,
                datasetType,
                model: modelKey,
                rowIndex: info.rowIndex,
                id: info.rowId,
              });
            },
            async onRowResult(info, context) {
              logger.info({
                result: `Completed row ${info.rowIndex}/${context.total}`,
                datasetType,
                model: modelKey,
                rowIndex: info.rowIndex,
                id: info.rowId,
              });
              writeArcCsv(datasetType, context.header, context.rows);
            },
          },
        });

        return new Response(
          JSON.stringify({
            datasetType,
            model: modelKey,
            processed: result.processed,
            skipped: result.skipped,
            total: result.total,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } catch (error) {
        if (error instanceof ArcBatchInputError) {
          return createErrorResponse(error.message);
        }
        logger.error({ error }, "Arc batch failed");
        return createErrorResponse("Unable to run batch right now.", 500);
      }
    });
  }, { method: "POST" });
}

export async function PUT(request: Request) {
  return withConcurrencyLogging(async () => {
    const body = (await request.json()) as BatchRunRequest;
    const datasetType = body.datasetType;
    const modelKey = body.model;

    if (!datasetType) {
      return createErrorResponse("Missing datasetType.");
    }

    if (!modelKey) {
      return createErrorResponse("Missing model.");
    }

    const modelConfig = getArcModelConfig(modelKey);
    if (!modelConfig) {
      return createErrorResponse("Unsupported model.");
    }

    const nValue = body.n;
    const limit = nValue && nValue > 0 ? Math.floor(nValue) : null;

    return withDatasetLock(datasetType, async () => {
      try {
        const client = getLibSqlClient();
        await ensureArcBatchTable(client);

        const result = await runArcBatch({
          datasetType,
          modelKey,
          limit,
          handlers: {
            onRowSkip(info, context) {
              logger.info({
                result: `skipped: row ${info.rowIndex}/${context.total}`,
                datasetType,
                model: modelKey,
                rowIndex: info.rowIndex,
                id: info.rowId,
              });
            },
            async onRowResult(info, context) {
              await upsertArcBatchResult(client, {
                moduleName: ARC_BATCH_MODULE_NAME,
                datasetType,
                modelKey,
                rowIndex: info.rowIndex,
                rowId: info.rowId,
                result: info.result,
              });
              logger.info({
                result: `queued: row ${info.rowIndex}/${context.total}`,
                datasetType,
                model: modelKey,
                rowIndex: info.rowIndex,
                id: info.rowId,
              });
            },
          },
        });

        const dbResults = await fetchArcBatchResults(
          client,
          ARC_BATCH_MODULE_NAME,
          datasetType,
          modelKey,
        );
        dbResults.forEach(entry => {
          const row = result.rows[entry.rowIndex - 1];
          if (row) {
            row[modelConfig.columnName] = entry.result;
          }
        });

        writeArcCsv(datasetType, result.header, result.rows);

        return new Response(
          JSON.stringify({
            datasetType,
            model: modelKey,
            processed: result.processed,
            skipped: result.skipped,
            total: result.total,
            synced: dbResults.length,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } catch (error) {
        if (error instanceof ArcBatchInputError) {
          return createErrorResponse(error.message);
        }
        logger.error({ error }, "Arc batch (LibSQL) failed");
        return createErrorResponse("Unable to run batch right now.", 500);
      }
    });
  }, { method: "PUT" });
}

function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
