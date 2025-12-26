import "@/lib/add-proxy";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { jinaUrlContext } from "./tools/jina-reader";
import { stepCountIs } from "ai";
import { QINIU_BASE_URL } from "@/config";
import jinaReader from "@/prompts/jina-reader";

export type Provider = "google" | "openai" | "deepseek" | "qwen" | "kimi" | "minimax" | "xiaomi";


function getQiniuChatModel(providerName: string, modelName: string) {
  const client = createOpenAI({
    apiKey: process.env.QINIU_API_KEY!,
    baseURL: QINIU_BASE_URL,
    name: providerName,
  });
  return client.chat(modelName);
}

function getOpenRouterChatModel(modelName: string) {
  const client = createOpenRouter({
    apiKey: process.env.OPEN_ROUTER_API_KEY!,
  });
  return client.chat(modelName);
}

function getMaaSChatModel(providerName: string, modelName: string) {
  const maasType = process.env.MAAS_TYPE?.trim().toUpperCase();
  if (maasType === "OPEN_ROUTER") {
    return getOpenRouterChatModel(modelName);
  }
  return getQiniuChatModel(providerName, modelName);
}

export function getModel(provider: Provider, modelName: string) {
  if (provider === "google") {
    const client = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
    return client(modelName);
  }

  if (provider === "deepseek") {
    return getMaaSChatModel("deepseek", modelName);
  }

  if (provider === "qwen") {
    return getMaaSChatModel("qwen", modelName);
  }

  if (provider === "kimi") {
    return getMaaSChatModel("kimi", modelName);
  }

  if (provider === "minimax") {
    return getMaaSChatModel("minimax", modelName);
  }

  if (provider === "openai" && modelName.startsWith("gpt-5.1")) {
    return getMaaSChatModel("qiniu", modelName);
  }

  if (provider === "xiaomi") {
    const client = createOpenAI({
      apiKey: process.env.XIAOMI_API_KEY!,
      baseURL: 'https://api.xiaomimimo.com/v1',
      name: 'xiaomi',
    });
    return client.chat(modelName);
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

export type GeminiToolOptions = {
  browseWeb?: boolean;
  googleSearch?: boolean;
};

export const geminiWithContextTool = (
  provider: Provider,
  modelName: string,
  prompt: string,
  toolOptions?: GeminiToolOptions,
) => {
  const tools: Record<string, unknown> = {};

  if (toolOptions?.browseWeb) {
    tools.url_context = google.tools.urlContext({});
  }

  if (toolOptions?.googleSearch) {
    tools.google_search = google.tools.googleSearch({});
  }

  const request = {
    model: getModel(provider, modelName),
    prompt,
    ...commonSettings,
  };

  if (Object.keys(tools).length) {
    return { ...request, tools };
  }

  return request;
};

// OpenAI
export const gpt4oMiniModel = getModel("openai", "gpt-4o-mini");

// it's a little slow.
export const commonWithContextTool = (provider: Provider, modelName: string, prompt: string) => {
  return {
    model: getModel(provider, modelName),
    prompt: `${prompt}\n${jinaReader}`,
    tools: {
      jina_url_context: jinaUrlContext,
    },
    ...commonSettings
  }
};

// DeepSeek
export const deepseekV31Model = getModel("deepseek", "deepseek-v3.1");
