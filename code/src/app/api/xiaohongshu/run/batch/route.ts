import { logger } from "@/lib/logger";
import {
  runXiaohongshuBatchAllFiles,
  XiaohongshuBatchInputError,
} from "@/lib/xiaohongshu-batch";
import { withXiaohongshuLock } from "@/lib/xiaohongshu-dataset";
import { getArcModelConfig, type BatchModelKey } from "@/lib/arc-batch";

export const runtime = "nodejs";

type BatchRunRequest = {
  n?: number;
  model?: BatchModelKey;
  concurrency?: number;
};

const MAX_CONCURRENCY = 20;

export async function POST(request: Request) {
  const body = (await request.json()) as BatchRunRequest;
  const modelKey = body.model;

  if (!modelKey) {
    return createErrorResponse("Missing model.");
  }

  if (!getArcModelConfig(modelKey)) {
    return createErrorResponse("Unsupported model.");
  }

  const nValue = body.n;
  const limit = nValue && nValue > 0 ? Math.floor(nValue) : null;
  const requestedConcurrency = body.concurrency ? Math.floor(body.concurrency) : MAX_CONCURRENCY;
  const concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, requestedConcurrency));

  return withXiaohongshuLock(async () => {
    try {
      const result = await runXiaohongshuBatchAllFiles({
        modelKey,
        limit,
        concurrency,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof XiaohongshuBatchInputError) {
        return createErrorResponse(error.message);
      }
      logger.error({ error }, "Xiaohongshu batch failed");
      return createErrorResponse("Unable to run batch right now.", 500);
    }
  });
}

function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
