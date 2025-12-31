import { logger } from "@/lib/logger";
import {
  CustomBatchInputError,
  runCustomBatchAllFiles,
} from "@/lib/custom-batch";
import { withCustomLock } from "@/lib/custom-dataset";
import { getArcModelConfig, type BatchModelKey } from "@/lib/arc-batch";

export const runtime = "nodejs";

type BatchRunRequest = {
  n?: number;
  model?: BatchModelKey;
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

  return withCustomLock(async () => {
    try {
      const result = await runCustomBatchAllFiles({
        modelKey,
        limit,
        concurrency: MAX_CONCURRENCY,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof CustomBatchInputError) {
        return createErrorResponse(error.message);
      }
      logger.error({ error }, "Custom batch failed");
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
