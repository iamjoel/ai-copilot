/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useState } from "react";
import { callCompletionApi } from "ai";
import { MODEL_GROUPS } from "@/lib/model-presets";
import testCases from "./test-cases";

type ModelOption = (typeof MODEL_GROUPS)[number]["options"][number];
const ALL_MODEL_OPTIONS: ModelOption[] = MODEL_GROUPS.flatMap(group => [
  ...group.options,
]);
const DEFAULT_MODEL_VALUE = ALL_MODEL_OPTIONS[0]?.value ?? "";

export const CUSTOM_PROMPT_VALUE = "__custom_prompt__";

export const getModelLabel = (value: string) =>
  ALL_MODEL_OPTIONS.find(option => option.value === value)?.label ?? value;

export type ModelResponse = {
  status: "loading" | "success" | "error";
  text?: string;
  error?: string;
};

export type PromptConfig = {
  applyOutputRules: boolean;
  language: string;
};

export type CompletionsController = {
  prompt: string;
  handlePromptChange: (value: string) => void;
  selectedPreset: string;
  handlePresetChange: (value: string) => void;
  selectedModels: string[];
  toggleModelSelection: (value: (typeof ALL_MODEL_OPTIONS)[number]["value"]) => void;
  promptConfig: PromptConfig;
  handlePromptConfigChange: (value: Partial<PromptConfig>) => void;
  modelResponses: Record<string, ModelResponse>;
  error: string | null;
  loading: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export const useCompletions = (): CompletionsController => {
  const [prompt, setPrompt] = useState(testCases[0].prompt);
  const [selectedPreset, setSelectedPreset] = useState(testCases[0].name);
  const [selectedModels, setSelectedModels] = useState<
    (typeof ALL_MODEL_OPTIONS)[number]["value"][]
  >(DEFAULT_MODEL_VALUE ? [DEFAULT_MODEL_VALUE] : []);
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    applyOutputRules: true,
    language: "中文",
  });
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePresetChange = (value: string) => {
    if (value === CUSTOM_PROMPT_VALUE) {
      setSelectedPreset(value);
      return;
    }

    const preset = testCases.find(test => test.name === value);
    if (!preset) return;
    setSelectedPreset(value);
    setPrompt(preset.prompt);
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (selectedPreset !== CUSTOM_PROMPT_VALUE) {
      setSelectedPreset(CUSTOM_PROMPT_VALUE);
    }
  };

  const toggleModelSelection = (value: (typeof ALL_MODEL_OPTIONS)[number]["value"]) => {
    setSelectedModels((prev: any) => {
      if (prev.includes(value)) {
        return prev.filter((modelValue: any) => modelValue !== value);
      }
      return [...prev, value];
    });
  };

  const handlePromptConfigChange = (value: Partial<PromptConfig>) => {
    setPromptConfig(prev => ({
      ...prev,
      ...value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    if (!selectedModels.length) {
      setError("请选择至少一个模型");
      return;
    }

    setError(null);
    setLoading(true);
    const modelsToRun = [...selectedModels];
    const initialResponses: Record<string, ModelResponse> = {};
    modelsToRun.forEach(modelValue => {
      initialResponses[modelValue] = { status: "loading", text: "" };
    });
    setModelResponses(initialResponses);

    await Promise.all(
      modelsToRun.map(async modelValue => {
        try {
          const result = await callCompletionApi({
            api: "/api/completions",
            prompt,
            body: {
              model: modelValue,
              config: {
                applyOutputRules: promptConfig.applyOutputRules,
                language: promptConfig.language.trim() || undefined,
              },
            },
            setCompletion: completion => {
              setModelResponses(prev => {
                const current = prev[modelValue];
                if (!current || current.status === "error" || current.text === completion) {
                  return prev;
                }
                return {
                  ...prev,
                  [modelValue]: {
                    status: "loading",
                    text: completion,
                  },
                };
              });
            },
            setLoading: () => undefined,
            setError: err => {
              if (!err) return;
              setModelResponses(prev => ({
                ...prev,
                [modelValue]: {
                  status: "error",
                  error: err instanceof Error ? err.message : "请求失败",
                },
              }));
            },
            setAbortController: () => undefined,
          });

          if (typeof result === "string") {
            setModelResponses(prev => ({
              ...prev,
              [modelValue]: {
                status: "success",
                text: result,
              },
            }));
          } else if (result === null) {
            setModelResponses(prev => ({
              ...prev,
              [modelValue]: {
                status: "error",
                error: "请求已取消",
              },
            }));
          }
        } catch (err) {
          setModelResponses(prev => ({
            ...prev,
            [modelValue]: {
              status: "error",
              error: err instanceof Error ? err.message : "请求失败",
            },
          }));
        }
      }),
    );

    setLoading(false);
  };

  return {
    prompt,
    handlePromptChange,
    selectedPreset,
    handlePresetChange,
    selectedModels,
    toggleModelSelection,
    promptConfig,
    handlePromptConfigChange,
    modelResponses,
    error,
    loading,
    handleSubmit,
  };
};
