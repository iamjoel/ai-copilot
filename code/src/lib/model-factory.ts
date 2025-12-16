import "@/lib/add-proxy";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { jinaUrlContext } from "./tools/jina-reader";
import { stepCountIs } from "ai";

export type Provider = "google" | "openai" | "deepseek" | "qwen" | "kimi" | "minimax";

const QINIU_BASE_URL = "https://api.qnaigc.com/v1";

function getQiniuChatModel(providerName: string, modelName: string) {
  const client = createOpenAI({
    apiKey: process.env.QINIU_API_KEY!,
    baseURL: QINIU_BASE_URL,
    name: providerName,
  });
  return client.chat(modelName);
}

export function getModel(provider: Provider, modelName: string) {
  if (provider === "google") {
    const client = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
    return client(modelName);
  }

  if (provider === "deepseek") {
    return getQiniuChatModel("deepseek", modelName);
  }

  if (provider === "qwen") {
    return getQiniuChatModel("qwen", modelName);
  }

  if (provider === "kimi") {
    return getQiniuChatModel("kimi", modelName);
  }

  if (provider === "minimax") {
    return getQiniuChatModel("minimax", modelName);
  }

  if (provider === "openai" && modelName.startsWith("gpt-5.1")) {
    return getQiniuChatModel("qiniu", modelName);
  }

  const client = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return client(modelName);
}

const commonSettings = {
  stopWhen: stepCountIs(3),
  maxRetries: 1,
};
// Gemini
export const gemini25FlashLiteModel = getModel("google", "models/gemini-2.5-flash-lite");
export const gemini25FlashModel = getModel("google", "models/gemini-2.5-flash");

export const geminiWithContextTool = (provider: Provider, modelName: string, prompt: string) => {
  return {
    model: getModel(provider, modelName),
    prompt,
    tools: {
      url_context: google.tools.urlContext({}),
    },
    ...commonSettings
  }
}

// OpenAI
export const gpt4oMiniModel = getModel("openai", "gpt-4o-mini");

// it's a little slow.
export const commonWithContextTool = (provider: Provider, modelName: string, prompt: string) => {
  return {
    model: getModel(provider, modelName),
    prompt: `If there is a URL, use jina_url_context to get the content of url.\n ${prompt}`,
    tools: {
      jina_url_context: jinaUrlContext,
    },
    ...commonSettings
  }
};

// DeepSeek
export const deepseekV31Model = getModel("deepseek", "deepseek-v3.1");
