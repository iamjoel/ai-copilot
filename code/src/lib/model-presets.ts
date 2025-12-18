import { type Provider } from "./model-factory";

type ModelGroupOption = {
  label: string;
  value: string;
  model: string;
};

export type ModelGroup = {
  provider: Provider;
  providerLabel: string;
  options: readonly ModelGroupOption[];
};

export type ModelPreset = {
  provider: Provider;
  model: string;
  label: string;
};

export const MODEL_GROUPS = [
  // curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
  {
    provider: "google",
    providerLabel: "Gemini",
    options: [
      {
        label: "Gemini 2.5 Flash Lite",
        value: "gemini-2.5-flash-lite",
        model: "models/gemini-2.5-flash-lite",
      },
      {
        label: "Gemini 2.5 Flash",
        value: "gemini-2.5-flash",
        model: "models/gemini-2.5-flash",
      },
      {
        label: "Gemini 2.5 Pro",
        value: "gemini-2.5-pro",
        model: "models/gemini-2.5-pro",
      },
      {
        label: "Gemini 3 Flash",
        value: "gemini-3-flash-preview",
        model: "models/gemini-3-flash-preview",
      },
      {
        label: "Gemini 3 Pro",
        value: "gemini-3-pro-preview",
        model: "models/gemini-3-pro-preview",
      },
    ],
  },
  {
    provider: "openai",
    providerLabel: "OpenAI",
    options: [
      {
        label: "GPT-4o mini",
        value: "gpt-4o-mini",
        model: "gpt-4o-mini",
      },
      {
        label: "GPT-5.1",
        value: "gpt-5.1",
        model: "gpt-5.1",
      },
    ],
  },
  {
    provider: "deepseek",
    providerLabel: "DeepSeek",
    options: [
      {
        label: "DeepSeek V3.1",
        value: "deepseek-v3.1",
        model: "deepseek-v3.1",
      },
    ],
  },
  {
    provider: "qwen",
    providerLabel: "Qwen",
    options: [
      {
        label: "Qwen Turbo",
        value: "qwen-turbo",
        model: "qwen-turbo",
      },
    ],
  },
  {
    provider: "kimi",
    providerLabel: "Kimi",
    options: [
      {
        label: "Kimi k2",
        value: "kimi-k2",
        model: "moonshotai/kimi-k2-0905",
      },
    ],
  },
  {
    provider: "minimax",
    providerLabel: "MiniMax",
    options: [
      {
        label: "minimax-m2",
        value: "minimax-m2",
        model: "minimax/minimax-m2",
      },
    ],
  },
  {
    provider: "xiaomi",
    providerLabel: "Xiaomi",
    options: [
      {
        label: "mimo-v2-flash",
        value: "mimo-v2-flash",
        model: "mimo-v2-flash",
      },
    ],
  }
] as const satisfies readonly ModelGroup[];

export type ModelPresetKey = (typeof MODEL_GROUPS)[number]["options"][number]["value"];

const MODEL_PRESET_ENTRIES = MODEL_GROUPS.flatMap(group =>
  group.options.map(option => [
    option.value,
    {
      provider: group.provider,
      model: option.model,
      label: option.label,
    } satisfies ModelPreset,
  ]),
) as Array<[ModelPresetKey, ModelPreset]>;

export const MODEL_PRESETS: Record<ModelPresetKey, ModelPreset> = Object.fromEntries(
  MODEL_PRESET_ENTRIES,
) as Record<ModelPresetKey, ModelPreset>;

export function getModelPreset(key: string) {
  return MODEL_PRESETS[key as ModelPresetKey];
}
