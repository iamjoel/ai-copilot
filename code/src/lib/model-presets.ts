import { type Provider } from "./model-factory";

type ModelGroupOption = {
  label: string;
  value: string;
  model: string | { open_router?: string; qiniu?: string; };
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

const isModelFromMaas = (model: ModelGroupOption["model"]): boolean => {
  return typeof model === "object";
}

const getModelName = (model: ModelGroupOption["model"], massType: string): string | undefined => {
  if (isModelFromMaas(model)) {
    return (model as Record<string, string>)[massType];
  }
  return model as string;
}
const RAW_MODEL_GROUPS = [
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
    provider: "anthropic",
    providerLabel: "Claude",
    options: [
      {
        label: "Claude Sonnet 4.5",
        value: "claude-sonnet-4-5",
        model: "claude-sonnet-4-5",
      },
      {
        label: "Claude Haiku 4.5",
        value: "claude-haiku-4-5",
        model: "claude-haiku-4-5",
      },
      {
        label: "Claude Opus 4.5",
        value: "claude-opus-4-5",
        model: "claude-opus-4-5",
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
        model: {
          open_router: "gpt-5.1",
        }
      },
    ],
  },
  {
    provider: "xai",
    providerLabel: "xAI",
    options: [
      {
        label: "Grok 4.1 Fast Reasoning",
        value: "grok-4-1-fast-reasoning",
        model: "grok-4-1-fast-reasoning",
      },
      {
        label: "Grok 4.1 Fast Non-Reasoning",
        value: "grok-4-1-fast-non-reasoning",
        model: "grok-4-1-fast-non-reasoning",
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
        model: {
          qiniu: "deepseek-v3.1",
        },
      },
      {
        label: "DeepSeek V3.2",
        value: "deepseek-v3.2",
        model: {
          open_router: "deepseek/deepseek-v3.2"
        },
      },
    ],
  },
  {
    provider: "qwen",
    providerLabel: "Qwen",
    // https://help.aliyun.com/zh/model-studio/models?spm=a2c4g.11186623.0.0.f4d25e66GQKVJB#9f8890ce29g5u
    options: [
      {
        label: "Qwen Flash",
        value: "qwen-flash",
        model: 'qwen-flash',
        // model: {
        //   qiniu: "qwen-turbo",
        //   open_router: "qwen/qwen-turbo",
        // },
      },
      {
        label: "Qwen Plus",
        value: "qwen-plus",
        model: 'qwen-plus',
      },
      {
        label: "Qwen3 max",
        value: "qwen3-max",
        model: 'qwen3-max',
      }
    ],
  },
  {
    provider: "kimi",
    providerLabel: "Kimi",
    options: [
      {
        label: "Kimi k2",
        value: "kimi-k2",
        model: {
          qiniu: "moonshotai/kimi-k2-0905",
          open_router: "moonshotai/kimi-k2-0905",
        },
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
        model: {
          qiniu: "minimax/minimax-m2",
          open_router: "minimax/minimax-m2",
        },
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

export const getModelGroups = (massType: string): ModelGroup[] => RAW_MODEL_GROUPS.map(group => ({
  ...group,
  options: group.options.filter(option => {
    const modelName = getModelName(option.model, massType);
    return !!modelName;
  }).map(option => {
    const modelName = getModelName(option.model, massType)!;
    return {
      ...option,
      model: modelName,
    };
  })
})).filter(group => group.options.length > 0);


const maasType = process.env.MAAS_TYPE?.toLocaleLowerCase(); // server-side only
export const MODEL_GROUPS = getModelGroups(maasType || ""); // server-side only

const MODEL_PRESET_ENTRIES = MODEL_GROUPS.flatMap(group =>
  group.options.map(option => [
    option.value,
    {
      provider: group.provider,
      model: option.model as string,
      label: option.label,
    } satisfies ModelPreset,
  ]),
) as Array<[string, ModelPreset]>;

export const MODEL_PRESETS: Record<string, ModelPreset> = Object.fromEntries(
  MODEL_PRESET_ENTRIES,
) as Record<string, ModelPreset>;

export function getModelPreset(key: string, modelPreset?: typeof MODEL_PRESETS): ModelPreset | undefined {
  return (modelPreset || MODEL_PRESETS)[key as string];
}
