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

type QueueItem = {
  id: string;
  fileName: string;
  text: string;
  status: "queued" | "translating" | "done" | "error";
  model?: string;
  estimatedInputTokens?: number | null;
  actualInputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  translation?: string;
  error?: string;
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
  const [model, setModel] = useState(modelGroups[0].options[0].value);
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

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue(items =>
      items.map(item => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const appendTranslationDelta = (id: string, delta: string) => {
    setQueue(items =>
      items.map(item =>
        item.id === id
          ? { ...item, translation: `${item.translation ?? ""}${delta}` }
          : item,
      ),
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
    updateQueueItem(item.id, {
      status: "translating",
      translation: "",
      actualInputTokens: null,
      outputTokens: null,
      totalTokens: null,
      error: undefined,
      model: modelKey,
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
          updateQueueItem(item.id, { actualInputTokens: event.inputTokens ?? null });
        } else if (event.type === "delta") {
          appendTranslationDelta(item.id, event.text);
        } else if (event.type === "done") {
          updateQueueItem(item.id, {
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

  const estimatedTokenSummary = useMemo<TokenSummaryItem[]>(() => {
    const activeItem = queue.find(item => item.id === activeId) ?? queue[0];
    const estimatedInputTokens = activeItem?.estimatedInputTokens ?? null;
    const estimatedOutputTokens = estimatedInputTokens ?? null;
    const estimatedTotalTokens =
      estimatedInputTokens !== null ? estimatedInputTokens + estimatedOutputTokens : null;
    const pricing = getPricing(activeItem?.model ?? model, estimatedInputTokens ?? null);
    const estimatedInputCost =
      pricing && estimatedInputTokens !== null ? estimatedInputTokens * pricing.inputPerToken : null;
    const estimatedOutputCost =
      pricing && estimatedOutputTokens !== null
        ? estimatedOutputTokens * pricing.outputPerToken
        : null;
    const estimatedTotalCost =
      estimatedInputCost !== null && estimatedOutputCost !== null
        ? estimatedInputCost + estimatedOutputCost
        : null;
    return [
      { label: "Estimated input tokens", value: estimatedInputTokens, costUsd: estimatedInputCost },
      { label: "Estimated output tokens", value: estimatedOutputTokens, costUsd: estimatedOutputCost },
      { label: "Estimated total tokens", value: estimatedTotalTokens, costUsd: estimatedTotalCost },
    ];
  }, [activeId, model, queue]);

  const actualTokenSummary = useMemo<TokenSummaryItem[]>(() => {
    const activeItem = queue.find(item => item.id === activeId) ?? queue[0];
    const actualInputTokens = activeItem?.actualInputTokens ?? null;
    const outputTokens = activeItem?.outputTokens ?? null;
    const totalTokens = activeItem?.totalTokens ?? null;
    const pricing = getPricing(activeItem?.model ?? model, actualInputTokens ?? null);
    const actualInputCost =
      pricing && actualInputTokens !== null ? actualInputTokens * pricing.inputPerToken : null;
    const actualOutputCost =
      pricing && outputTokens !== null ? outputTokens * pricing.outputPerToken : null;
    const actualTotalCost =
      actualInputCost !== null && actualOutputCost !== null ? actualInputCost + actualOutputCost : null;
    return [
      { label: "Actual input tokens", value: actualInputTokens, costUsd: actualInputCost },
      { label: "Actual output tokens", value: outputTokens, costUsd: actualOutputCost },
      { label: "Actual total tokens", value: totalTokens, costUsd: actualTotalCost },
    ];
  }, [activeId, model, queue]);

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
      newItems.push({
        id,
        fileName: file.name,
        text,
        status: "queued",
        model,
      });
    }

    setQueue(prev => [...prev, ...newItems]);
    if (!activeId && newItems[0]) {
      setActiveId(newItems[0].id);
    }

    for (const item of newItems) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const tokens = await countTokens({
          text: item.text,
          model,
          targetLanguage,
        });
        updateQueueItem(item.id, { estimatedInputTokens: tokens, model });
      } catch (countError) {
        updateQueueItem(item.id, { status: "error", error: "Token count failed." });
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

    setIsProcessing(true);
    for (const item of queue) {
      if (item.status !== "queued") {
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await translateItem(item, model, targetLanguage);
      } catch (translateError) {
        updateQueueItem(item.id, {
          status: "error",
          error: translateError instanceof Error ? translateError.message : "Translation failed.",
        });
      }
    }
    setIsProcessing(false);
  };

  const handleModelChange = async (nextModel: string) => {
    setModel(nextModel);
    if (!queue.length) {
      return;
    }
    setIsCounting(true);
    try {
      await Promise.all(
        queue.map(async item => {
          const tokens = await countTokens({
            text: item.text,
            model: nextModel,
            targetLanguage,
          });
          updateQueueItem(item.id, { estimatedInputTokens: tokens, model: nextModel });
        }),
      );
    } catch (countError) {
      setError(countError instanceof Error ? countError.message : "Token count failed.");
    } finally {
      setIsCounting(false);
    }
  };

  const handleDownload = (item: QueueItem) => {
    const activeTranslation = item.translation ?? "";
    if (!activeTranslation.trim()) {
      setError("No translation to download.");
      return;
    }

    const baseName = item.fileName.replace(/\\.txt$/i, "") || "translation";
    const suffix = targetLanguage === "zh" ? "zh" : "en";
    const outputName = `${baseName}-${suffix}.txt`;
    const blob = new Blob([activeTranslation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = outputName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 text-gray-100">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-gray-400">LLM Translation</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Translate TXT Files</h1>
        <p className="mt-3 max-w-3xl text-sm text-gray-300">
          Upload a plain text file, choose a target language, and translate it with Claude or Gemini.
          Input tokens are counted after upload; output tokens come from the LLM response.
        </p>
      </header>

      <form onSubmit={event => event.preventDefault()} className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Model
            </label>
            <select
              value={model}
              onChange={event => {
                void handleModelChange(event.target.value);
              }}
              className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-gray-200"
            >
              {modelGroups.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
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

        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Source text
          </label>
          <textarea
            value={(queue.find(item => item.id === activeId) ?? queue[0])?.text ?? ""}
            readOnly
            rows={9}
            placeholder="Upload .txt files to load contents here."
            className="w-full resize-y rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-200 placeholder:text-gray-500"
          />
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
                  <span className="text-xs text-gray-400">{item.status}</span>
                  {item.translation?.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white transition hover:border-white/40"
                    >
                      Download
                    </button>
                  ) : null}
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
            Estimated tokens are counted after upload. Actual tokens come from the model response.
          </p>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {estimatedTokenSummary.map(item => (
              <div key={item.label} className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{item.label}</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatTokens(item.value)}
                </div>
                <div className="mt-1 text-xs text-gray-400">Cost: {formatUsd(item.costUsd)}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {actualTokenSummary.map(item => (
              <div key={item.label} className="rounded border border-white/10 bg-black/40 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{item.label}</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatTokens(item.value)}
                </div>
                <div className="mt-1 text-xs text-gray-400">Cost: {formatUsd(item.costUsd)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Translation</h2>
          <p className="mt-1 text-xs text-gray-400">Output text from the selected model.</p>
        </div>
        <div className="min-h-[160px] max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-200">
          {(queue.find(item => item.id === activeId) ?? queue[0])?.translation || "Translated text will appear here."}
        </div>
      </section>
    </main>
  );
}
