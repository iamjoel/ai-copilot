"use client";

import { useMemo, useState } from "react";

const modelGroups = [
  {
    label: "Gemini",
    options: [
      { label: "Gemini 2.5 Flash Lite", value: "gemini-2.5-flash-lite" },
      { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
      { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
      { label: "Gemini 3 Flash", value: "gemini-3-flash-preview" },
      { label: "Gemini 3 Pro", value: "gemini-3-pro-preview" },
    ],
  },
  {
    label: "Claude",
    options: [
      { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5" },
      { label: "Claude Haiku 4.5", value: "claude-haiku-4-5" },
      { label: "Claude Opus 4.5", value: "claude-opus-4-5" },
    ],
  },
] as const;

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Chinese", value: "zh" },
] as const;

const MODEL_LABELS = Object.fromEntries(
  modelGroups.flatMap(group => group.options.map(option => [option.value, option.label])),
);

type CountResponse = {
  inputTokens: number | null;
  error?: string;
};

type TranslateResponse = {
  translation?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  error?: string;
};

type StreamEvent =
  | { type: "meta"; inputTokens: number | null }
  | { type: "delta"; text: string }
  | { type: "done"; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null }
  | { type: "error"; message: string };

type TranslationResult = {
  status: "queued" | "translating" | "done" | "error";
  estimatedInputTokens?: number | null;
  actualInputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  translation?: string;
  error?: string;
};

type QueueItem = {
  id: string;
  fileName: string;
  text: string;
  results: Record<string, TranslationResult>;
};

type PricingInfo = {
  inputPerMillion: number;
  outputPerMillion: number;
  inputPerMillionOver200k?: number;
  outputPerMillionOver200k?: number;
};

type TokenSummaryItem = {
  label: string;
  value: number | null;
  costUsd: number | null;
};

const MODEL_PRICING: Record<string, PricingInfo> = {
  "gemini-3-pro-preview": {
    inputPerMillion: 2.0,
    outputPerMillion: 12.0,
    inputPerMillionOver200k: 4.0,
    outputPerMillionOver200k: 18.0,
  },
  "gemini-3-flash-preview": { inputPerMillion: 0.5, outputPerMillion: 3.0 },
  "gemini-2.5-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 10.0,
    inputPerMillionOver200k: 2.5,
    outputPerMillionOver200k: 15.0,
  },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "claude-opus-4-5": { inputPerMillion: 5.0, outputPerMillion: 25.0 },
  "claude-sonnet-4-5": { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  "claude-haiku-4-5": { inputPerMillion: 1.0, outputPerMillion: 5.0 },
};

const PER_MILLION = 1_000_000;
const LONG_CONTEXT_THRESHOLD = 200_000;

export default function TranslatePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    modelGroups[0].options[0].value,
  ]);
  const [targetLanguage, setTargetLanguage] = useState<"en" | "zh">("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasQueue = queue.length > 0;
  const formatUsd = (value: number | null) =>
    value === null ? "N/A" : `$${value.toFixed(2)}`;

  const formatTokens = (value: number | null) =>
    value === null ? "N/A" : value.toLocaleString("en-US");

  const getPricing = (modelKey: string, inputTokenCount: number | null) => {
    const pricing = MODEL_PRICING[modelKey];
    if (!pricing) {
      return null;
    }
    if (
      inputTokenCount !== null &&
      inputTokenCount > LONG_CONTEXT_THRESHOLD &&
      pricing.inputPerMillionOver200k !== undefined &&
      pricing.outputPerMillionOver200k !== undefined
    ) {
      return {
        inputPerToken: pricing.inputPerMillionOver200k / PER_MILLION,
        outputPerToken: pricing.outputPerMillionOver200k / PER_MILLION,
      };
    }
    return {
      inputPerToken: pricing.inputPerMillion / PER_MILLION,
      outputPerToken: pricing.outputPerMillion / PER_MILLION,
    };
  };

  const updateQueueResult = (
    id: string,
    modelKey: string,
    patch: Partial<TranslationResult>,
  ) => {
    setQueue(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              results: {
                ...item.results,
                [modelKey]: { ...item.results[modelKey], ...patch },
              },
            }
          : item,
      ),
    );
  };

  const appendTranslationDelta = (id: string, modelKey: string, delta: string) => {
    setQueue(items =>
      items.map(item => {
        if (item.id !== id) {
          return item;
        }
        const current = item.results[modelKey]?.translation ?? "";
        return {
          ...item,
          results: {
            ...item.results,
            [modelKey]: {
              ...item.results[modelKey],
              translation: `${current}${delta}`,
            },
          },
        };
      }),
    );
  };

  const countTokens = async (payload: { text: string; model: string; targetLanguage: "en" | "zh" }) => {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, mode: "count" }),
    });

    const data = (await response.json()) as CountResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "Token count failed.");
    }
    return data.inputTokens ?? null;
  };

  const translateItem = async (item: QueueItem, modelKey: string, language: "en" | "zh") => {
    updateQueueResult(item.id, modelKey, {
      status: "translating",
      translation: "",
      actualInputTokens: null,
      outputTokens: null,
      totalTokens: null,
      error: undefined,
    });
    setActiveId(item.id);

    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.text, model: modelKey, targetLanguage: language, mode: "stream" }),
    });

    if (!response.ok) {
      const data = (await response.json()) as TranslateResponse;
      throw new Error(data.error ?? "Translation failed.");
    }

    if (!response.body) {
      throw new Error("Streaming response is unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) {
          continue;
        }
        const payload = line.replace(/^data:\s*/, "");
        const event = JSON.parse(payload) as StreamEvent;

        if (event.type === "meta") {
          updateQueueResult(item.id, modelKey, {
            actualInputTokens: event.inputTokens ?? null,
          });
        } else if (event.type === "delta") {
          appendTranslationDelta(item.id, modelKey, event.text);
        } else if (event.type === "done") {
          updateQueueResult(item.id, modelKey, {
            status: "done",
            actualInputTokens: event.inputTokens ?? null,
            outputTokens: event.outputTokens ?? null,
            totalTokens: event.totalTokens ?? null,
          });
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }
  };

  const activeItem = useMemo(
    () => queue.find(item => item.id === activeId) ?? queue[0],
    [activeId, queue],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    setError(null);
    setIsCounting(true);
    const newItems: QueueItem[] = [];

    for (const file of files) {
      const text = await file.text();
      const id = crypto.randomUUID();
      const results = Object.fromEntries(
        selectedModels.map(modelKey => [modelKey, { status: "queued" } as TranslationResult]),
      );
      newItems.push({
        id,
        fileName: file.name,
        text,
        results,
      });
    }

    setQueue(prev => [...prev, ...newItems]);
    if (!activeId && newItems[0]) {
      setActiveId(newItems[0].id);
    }

    for (const item of newItems) {
      for (const modelKey of selectedModels) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const tokens = await countTokens({
            text: item.text,
            model: modelKey,
            targetLanguage,
          });
          updateQueueResult(item.id, modelKey, { estimatedInputTokens: tokens });
        } catch (countError) {
          updateQueueResult(item.id, modelKey, {
            status: "error",
            error: "Token count failed.",
          });
        }
      }
    }

    setIsCounting(false);
  };

  const startQueue = async () => {
    setError(null);
    if (!hasQueue) {
      setError("Please upload at least one .txt file.");
      return;
    }
    if (selectedModels.length === 0) {
      setError("Please select at least one model.");
      return;
    }

    setIsProcessing(true);
    const preparedQueue = queue.map(item => {
      const results = { ...item.results };
      for (const modelKey of selectedModels) {
        results[modelKey] = {
          ...results[modelKey],
          status: "queued",
          translation: "",
          actualInputTokens: null,
          outputTokens: null,
          totalTokens: null,
          error: undefined,
        };
      }
      return { ...item, results };
    });
    setQueue(preparedQueue);
    for (const item of preparedQueue) {
      for (const modelKey of selectedModels) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await translateItem(item, modelKey, targetLanguage);
        } catch (translateError) {
          updateQueueResult(item.id, modelKey, {
            status: "error",
            error:
              translateError instanceof Error ? translateError.message : "Translation failed.",
          });
        }
      }
    }
    setIsProcessing(false);
  };

  const refreshEstimates = async (modelsToCount: string[]) => {
    if (!queue.length || modelsToCount.length === 0) {
      return;
    }
    setIsCounting(true);
    try {
      for (const item of queue) {
        for (const modelKey of modelsToCount) {
          // eslint-disable-next-line no-await-in-loop
          const tokens = await countTokens({
            text: item.text,
            model: modelKey,
            targetLanguage,
          });
          updateQueueResult(item.id, modelKey, { estimatedInputTokens: tokens });
        }
      }
    } catch (countError) {
      setError(countError instanceof Error ? countError.message : "Token count failed.");
    } finally {
      setIsCounting(false);
    }
  };

  const handleModelToggle = async (modelKey: string) => {
    const nextSelected = selectedModels.includes(modelKey)
      ? selectedModels.filter(value => value !== modelKey)
      : [...selectedModels, modelKey];
    if (nextSelected.length === 0) {
      return;
    }
    setSelectedModels(nextSelected);
    setQueue(items =>
      items.map(item => {
        const results = { ...item.results };
        for (const key of nextSelected) {
          if (!results[key]) {
            results[key] = { status: "queued" };
          }
        }
        return { ...item, results };
      }),
    );
    await refreshEstimates(nextSelected);
  };

  const handleDownload = (item: QueueItem, modelKey: string) => {
    const activeTranslation = item.results[modelKey]?.translation ?? "";
    if (!activeTranslation.trim()) {
      setError("No translation to download.");
      return;
    }

    const baseName = item.fileName.replace(/\\.txt$/i, "") || "translation";
    const suffix = targetLanguage === "zh" ? "zh" : "en";
    const outputName = `${baseName}-${modelKey}-${suffix}.txt`;
    const blob = new Blob([activeTranslation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = outputName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getItemStatus = (item: QueueItem) => {
    const results = selectedModels
      .map(modelKey => item.results[modelKey])
      .filter(Boolean);
    if (results.some(result => result?.status === "translating")) {
      return "translating";
    }
    if (results.some(result => result?.status === "error")) {
      return "error";
    }
    if (results.length > 0 && results.every(result => result?.status === "done")) {
      return "done";
    }
    return "queued";
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 text-gray-100">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-gray-400">LLM Translation</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Translate TXT Files</h1>
        <p className="mt-3 max-w-3xl text-sm text-gray-300">
          Upload a plain text file, choose a target language, and translate it with Claude or Gemini.
          Input tokens are counted after upload; output tokens come from the LLM responses.
        </p>
      </header>

      <form onSubmit={event => event.preventDefault()} className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Models
            </label>
            <div className="grid gap-3 rounded border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
              {modelGroups.map(group => (
                <div key={group.label} className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-gray-400">
                    {group.label}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.options.map(option => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(option.value)}
                          onChange={() => {
                            void handleModelToggle(option.value);
                          }}
                          className="size-4 rounded border-white/20 bg-black/40 text-white"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Target language
            </label>
            <select
              value={targetLanguage}
              onChange={event => setTargetLanguage(event.target.value as "en" | "zh")}
              className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-gray-200"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Queue</h2>
          <p className="mt-1 text-xs text-gray-400">Files are processed in order.</p>
        </div>
        <div className="grid gap-2">
          {queue.length === 0 ? (
            <p className="text-sm text-gray-400">No files queued yet.</p>
          ) : (
            queue.map(item => (
              <div
                key={item.id}
                className={`flex w-full items-center justify-between rounded border border-white/10 px-3 py-2 text-sm ${
                  item.id === activeId ? "bg-white/10 text-white" : "bg-black/30 text-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="flex-1 truncate text-left"
                >
                  {item.fileName}
                </button>
                <div className="ml-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">{getItemStatus(item)}</span>
                  {selectedModels.map(modelKey => {
                    const result = item.results[modelKey];
                    if (!result?.translation?.trim()) {
                      return null;
                    }
                    return (
                      <button
                        key={modelKey}
                        type="button"
                        onClick={() => handleDownload(item, modelKey)}
                        className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white transition hover:border-white/40"
                      >
                        {MODEL_LABELS[modelKey] ?? modelKey}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-300">
            {isCounting ? "Counting tokens..." : "Token count ready"}
          </span>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40">
              Add files
              <input
                type="file"
                accept=".txt,text/plain"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={startQueue}
              disabled={!hasQueue || isProcessing}
              className="inline-flex items-center justify-center rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "Translating..." : "Start"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Tokens</h2>
          <p className="mt-1 text-xs text-gray-400">
            Estimated tokens are counted after upload. Actual tokens come from the model responses.
          </p>
        </div>
        {selectedModels.length === 0 ? (
          <p className="text-sm text-gray-400">Select at least one model to see token estimates.</p>
        ) : (
          <div className="grid gap-4">
            {selectedModels.map(modelKey => {
              const result = activeItem?.results[modelKey];
              const estimatedInputTokens = result?.estimatedInputTokens ?? null;
              const estimatedOutputTokens = estimatedInputTokens ?? null;
              const estimatedTotalTokens =
                estimatedInputTokens !== null ? estimatedInputTokens + estimatedOutputTokens : null;
              const estimatedPricing = getPricing(modelKey, estimatedInputTokens ?? null);
              const estimatedInputCost =
                estimatedPricing && estimatedInputTokens !== null
                  ? estimatedInputTokens * estimatedPricing.inputPerToken
                  : null;
              const estimatedOutputCost =
                estimatedPricing && estimatedOutputTokens !== null
                  ? estimatedOutputTokens * estimatedPricing.outputPerToken
                  : null;
              const estimatedTotalCost =
                estimatedInputCost !== null && estimatedOutputCost !== null
                  ? estimatedInputCost + estimatedOutputCost
                  : null;

              const actualInputTokens = result?.actualInputTokens ?? null;
              const outputTokens = result?.outputTokens ?? null;
              const totalTokens = result?.totalTokens ?? null;
              const actualPricing = getPricing(modelKey, actualInputTokens ?? null);
              const actualInputCost =
                actualPricing && actualInputTokens !== null
                  ? actualInputTokens * actualPricing.inputPerToken
                  : null;
              const actualOutputCost =
                actualPricing && outputTokens !== null
                  ? outputTokens * actualPricing.outputPerToken
                  : null;
              const actualTotalCost =
                actualInputCost !== null && actualOutputCost !== null
                  ? actualInputCost + actualOutputCost
                  : null;

              const estimatedItems: TokenSummaryItem[] = [
                {
                  label: "Estimated input tokens",
                  value: estimatedInputTokens,
                  costUsd: estimatedInputCost,
                },
                {
                  label: "Estimated output tokens",
                  value: estimatedOutputTokens,
                  costUsd: estimatedOutputCost,
                },
                {
                  label: "Estimated total tokens",
                  value: estimatedTotalTokens,
                  costUsd: estimatedTotalCost,
                },
              ];

              const actualItems: TokenSummaryItem[] = [
                { label: "Actual input tokens", value: actualInputTokens, costUsd: actualInputCost },
                { label: "Actual output tokens", value: outputTokens, costUsd: actualOutputCost },
                { label: "Actual total tokens", value: totalTokens, costUsd: actualTotalCost },
              ];

              return (
                <div key={modelKey} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">
                    {MODEL_LABELS[modelKey] ?? modelKey}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {estimatedItems.map(item => (
                      <div key={item.label} className="rounded border border-white/10 bg-black/40 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                          {item.label}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatTokens(item.value)}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Cost: {formatUsd(item.costUsd)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {actualItems.map(item => (
                      <div key={item.label} className="rounded border border-white/10 bg-black/40 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                          {item.label}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatTokens(item.value)}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Cost: {formatUsd(item.costUsd)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Translation</h2>
          <p className="mt-1 text-xs text-gray-400">
            Output text for each selected model.
          </p>
        </div>
        {selectedModels.length === 0 ? (
          <p className="text-sm text-gray-400">Select models to view translations.</p>
        ) : (
          <div className="grid gap-3">
            {selectedModels.map(modelKey => {
              const translationText = activeItem?.results[modelKey]?.translation ?? "";
              return (
                <div key={modelKey} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">
                    {MODEL_LABELS[modelKey] ?? modelKey}
                  </div>
                  <div className="min-h-[140px] max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-3 text-sm text-gray-200">
                    {translationText || "Translated text will appear here."}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
