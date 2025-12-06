import "@/lib/add-proxy";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export type Provider = "google" | "openai";

export function getModel(provider: Provider, modelName: string) {
  if (provider === "google") {
    const client = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
    return client(modelName);
  }

  const client = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return client(modelName);
}
