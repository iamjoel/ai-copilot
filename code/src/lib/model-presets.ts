import { type Provider } from "./model-factory";

export type ModelPresetKey =
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-3"
  | "gpt-4o-mini"
  | "deepseek-v3.1";

export type ModelPreset = {
  provider: Provider;
  model: string;
  label: string;
};

export const MODEL_PRESETS: Record<ModelPresetKey, ModelPreset> = {
  "gemini-2.5-flash-lite": {
    provider: "google",
    model: "models/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
  },
  "gemini-2.5-flash": {
    provider: "google",
    model: "models/gemini-2.0-flash-exp",
    label: "Gemini 2.5 Flash",
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "models/gemini-2.0-pro-exp-02-05",
    label: "Gemini 2.5 Pro",
  },
  "gemini-3": {
    provider: "google",
    model: "models/gemini-1.5-pro",
    label: "Gemini 3",
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    label: "GPT-4o mini",
  },
  "deepseek-v3.1": {
    provider: "deepseek",
    model: "deepseek-v3.1",
    label: "DeepSeek V3.1",
  },
};

export function getModelPreset(key: string) {
  return MODEL_PRESETS[key as ModelPresetKey];
}
