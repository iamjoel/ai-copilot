'use client';

import { FormEvent, useState } from "react";
import { MODEL_GROUPS } from "@/lib/model-presets";
import testCases from "./test-cases";

const ALL_MODEL_OPTIONS = MODEL_GROUPS.flatMap(group => group.options);
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
  toggleModelSelection: (value: string) => void;
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
  const [selectedModels, setSelectedModels] = useState(
    DEFAULT_MODEL_VALUE ? [DEFAULT_MODEL_VALUE] : [],
  );
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

  const toggleModelSelection = (value: string) => {
    setSelectedModels(prev => {
      if (prev.includes(value)) {
        return prev.filter(modelValue => modelValue !== value);
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
      initialResponses[modelValue] = { status: "loading" };
    });
    setModelResponses(initialResponses);

    await Promise.all(modelsToRun.map(runModel));

    setLoading(false);

    async function runModel(modelValue: string) {
      try {
        const res = await fetch("/api/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            model: modelValue,
            config: {
              applyOutputRules: promptConfig.applyOutputRules,
              language: promptConfig.language.trim() || undefined,
            },
          }),
        });

        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "请求失败");
        }

        setModelResponses(prev => ({
          ...prev,
          [modelValue]: {
            status: "success",
            text: data.text ?? "",
          },
        }));
      } catch (err) {
        setModelResponses(prev => ({
          ...prev,
          [modelValue]: {
            status: "error",
            error: err instanceof Error ? err.message : "请求失败",
          },
        }));
      }
    }
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
