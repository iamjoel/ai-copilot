/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useEffect, useState } from "react";
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from "ai";
import testCases from "./test-cases";
import { useModel } from "@/hooks/use-model";
import { type UsageDetail } from "@/lib/usage-utils";
import { getModelPreset } from "@/lib/model-presets";


export const CUSTOM_PROMPT_VALUE = "__custom_prompt__";

export type ModelResponse = {
  status: "loading" | "success" | "error";
  text?: string;
  error?: string;
  responseTimeSec?: number;
  usage?: UsageDetail;
};

export type PromptConfig = {
  applyOutputRules: boolean;
  language: string;
};

export type ToolSelection = {
  browseWeb: boolean;
  googleSearch: boolean;
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
  toolSelection: ToolSelection;
  toggleToolSelection: (tool: keyof ToolSelection) => void;
};

export const useCompletions = (): CompletionsController => {
  const { defaultModelValue } = useModel();
  const [prompt, setPrompt] = useState(testCases[0].prompt);
  const [selectedPreset, setSelectedPreset] = useState(testCases[0].name);
  const [selectedModels, setSelectedModels] = useState(defaultModelValue ? [defaultModelValue] : []);
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    applyOutputRules: true,
    language: "English",
  });
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toolSelection, setToolSelection] = useState<ToolSelection>({
    browseWeb: false,
    googleSearch: false,
  });

  const isGeminiModel = (value: string) => {
    const preset = getModelPreset(value);
    return preset?.provider === "google";
  };
  const hasGeminiModelSelected = selectedModels.some(isGeminiModel);

  useEffect(() => {
    if (!hasGeminiModelSelected) {
      setToolSelection(prev => {
        if (!prev.browseWeb && !prev.googleSearch) {
          return prev;
        }
        return {
          browseWeb: false,
          googleSearch: false,
        };
      });
    }
  }, [hasGeminiModelSelected]);

  const toggleToolSelection = (tool: keyof ToolSelection) => {
    if (!hasGeminiModelSelected) {
      return;
    }
    setToolSelection(prev => ({
      ...prev,
      [tool]: !prev[tool],
    }));
  };

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
      setError("Please select at least one model.");
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
        const startedAt = Date.now();
        const updateResponseTime = () => {
          const responseTimeSec = Math.round((Date.now() - startedAt) / 1000);
          setModelResponses(prev => {
            const current = prev[modelValue];
            if (!current) return prev;
            return {
              ...prev,
              [modelValue]: {
                ...current,
                responseTimeSec,
              },
            };
          });
        };
        const updateUsageFromMetadata = (metadata?: {
          inputTokens?: number;
          outputTokens?: number;
          urlTokens?: number;
          totalTokens?: number;
        }) => {
          if (!metadata) return;
          const hasAny =
            metadata.inputTokens !== undefined ||
            metadata.outputTokens !== undefined ||
            metadata.urlTokens !== undefined ||
            metadata.totalTokens !== undefined;
          if (!hasAny) return;
          const totalTokens =
            metadata.totalTokens ??
            (metadata.inputTokens !== undefined &&
              metadata.outputTokens !== undefined &&
              metadata.urlTokens !== undefined
              ? metadata.inputTokens + metadata.outputTokens + metadata.urlTokens
              : undefined);
          const usageDetail: UsageDetail = {
            inputTokens: metadata.inputTokens,
            outputTokens: metadata.outputTokens,
            urlTokens: metadata.urlTokens,
            totalTokens,
            raw: metadata,
          };
          setModelResponses(prev => {
            const current = prev[modelValue];
            if (!current) return prev;
            return {
              ...prev,
              [modelValue]: {
                ...current,
                usage: usageDetail,
              },
            };
          });
        };

        try {
          const response = await fetch("/api/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              model: modelValue,
              config: {
                applyOutputRules: promptConfig.applyOutputRules,
                language: promptConfig.language.trim() || undefined,
              },
              tools: toolSelection,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error ?? "Request failed");
          }

          if (!response.body) {
            throw new Error("Response body was empty");
          }

          const parsedStream = parseJsonEventStream({
            stream: response.body,
            schema: uiMessageChunkSchema,
          });
          const chunkStream = parsedStream.pipeThrough(
            new TransformStream({
              transform(part, controller) {
                if (!part?.success) return;
                const chunk = part.value;
                if (chunk?.messageMetadata) {
                  updateUsageFromMetadata(chunk.messageMetadata as {
                    inputTokens?: number;
                    outputTokens?: number;
                    urlTokens?: number;
                    totalTokens?: number;
                  });
                }
                controller.enqueue(chunk);
              },
            }),
          );

          let completionText = "";
          for await (const message of readUIMessageStream({ stream: chunkStream })) {
            const latestText = (message.parts ?? [])
              .filter(part => part.type === "text")
              .map(part => part.text)
              .join("");
            if (latestText !== completionText) {
              completionText = latestText;
              setModelResponses(prev => {
                const current = prev[modelValue];
                if (!current || current.status === "error") {
                  return prev;
                }
                return {
                  ...prev,
                  [modelValue]: {
                    ...current,
                    status: "loading",
                    text: completionText,
                  },
                };
              });
            }
            if (message.metadata) {
              updateUsageFromMetadata(message.metadata as {
                inputTokens?: number;
                outputTokens?: number;
                urlTokens?: number;
                totalTokens?: number;
              });
            }
          }

          updateResponseTime();
          setModelResponses(prev => ({
            ...prev,
            [modelValue]: {
              ...prev[modelValue],
              status: "success",
              text: completionText,
            },
          }));
        } catch (err) {
          updateResponseTime();
          setModelResponses(prev => ({
            ...prev,
            [modelValue]: {
              ...prev[modelValue],
              status: "error",
              error: err instanceof Error ? err.message : "Request failed",
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
    toolSelection,
    toggleToolSelection,
  };
};
