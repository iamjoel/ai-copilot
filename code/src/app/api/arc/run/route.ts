import { logger } from "@/lib/logger";
import { getModel } from "@/lib/model-factory";
import type { ArcChoice } from "@/lib/arc-dataset";
import { generateText } from "ai";

export const runtime = "nodejs";

const runLogger = logger.child({ feature: "arc-run" });

type RunRequestBody = {
  question?: string;
  choices?: ArcChoice[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RunRequestBody;
    const question = body.question?.trim();
    const choices = body.choices ?? [];

    if (!question) {
      return createErrorResponse("Missing question.");
    }

    if (!choices.length) {
      return createErrorResponse("Missing choices.");
    }

    const prompt = buildArcPrompt(question, choices);
    runLogger.info({ step: "arc_run_start", choiceCount: choices.length });

    const result = await generateText({
      model: getModel("qwen", "qwen/qwen-flash"),
      prompt,
    });

    const prediction = extractChoiceLabel(result.text);
    runLogger.info({ step: "arc_run_completed", prediction });

    return new Response(
      JSON.stringify({
        prediction,
        raw: result.text,
        model: "qwen-turbo",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    runLogger.error({ step: "arc_run_error", error });
    return new Response(JSON.stringify({ error: "ARC run failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildArcPrompt(question: string, choices: ArcChoice[]) {
  const choiceLines = choices
    .map(choice => `${choice.label}. ${choice.text}`)
    .join("\n");

  return [
    "You are answering a multiple-choice question from the ARC dataset.",
    "Pick the best answer and reply with only the option label (A, B, C, or D).",
    "",
    `Question: ${question}`,
    "Choices:",
    choiceLines,
    "",
    "Answer:",
  ].join("\n");
}

function extractChoiceLabel(text: string) {
  const match = text.match(/\b([A-D])\b/i);
  if (match?.[1]) {
    return match[1].toUpperCase();
  }
  return text.trim().slice(0, 20);
}

function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
