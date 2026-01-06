"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

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
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [model, setModel] = useState(modelGroups[0].options[0].value);
  const [targetLanguage, setTargetLanguage] = useState<"en" | "zh">("en");
  const [translation, setTranslation] = useState("");
  const [estimatedInputTokens, setEstimatedInputTokens] = useState<number | null>(null);
  const [actualInputTokens, setActualInputTokens] = useState<number | null>(null);
  const [outputTokens, setOutputTokens] = useState<number | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasText = sourceText.trim().length > 0;
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

  const countMutation = useMutation({
    mutationFn: async (payload: { text: string; model: string; targetLanguage: "en" | "zh" }) => {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode: "count" }),
      });

      const data = (await response.json()) as CountResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Token count failed.");
      }
      return data;
    },
    onSuccess: data => {
      setEstimatedInputTokens(data.inputTokens ?? null);
    },
    onError: err => {
      console.error("Token count error:", err);
      setError(err instanceof Error ? err.message : "Token count failed.");
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (payload: { text: string; model: string; targetLanguage: "en" | "zh" }) => {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode: "stream" }),
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
            setActualInputTokens(event.inputTokens ?? null);
          } else if (event.type === "delta") {
            setTranslation(prev => prev + event.text);
          } else if (event.type === "done") {
            setActualInputTokens(event.inputTokens ?? null);
            setOutputTokens(event.outputTokens ?? null);
            setTotalTokens(event.totalTokens ?? null);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      return { translation: "streamed" };
    },
    onError: err => {
      console.error("Translation error:", err);
      setError(err instanceof Error ? err.message : "Translation failed.");
    },
  });

  const estimatedTokenSummary = useMemo<TokenSummaryItem[]>(() => {
    const estimatedOutputTokens = estimatedInputTokens ?? null;
    const estimatedTotalTokens =
      estimatedInputTokens !== null ? estimatedInputTokens + estimatedOutputTokens : null;
    const pricing = getPricing(model, estimatedInputTokens ?? null);
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
  }, [estimatedInputTokens, model]);

  const actualTokenSummary = useMemo<TokenSummaryItem[]>(() => {
    const pricing = getPricing(model, actualInputTokens ?? null);
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
  }, [actualInputTokens, model, outputTokens, totalTokens]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);
    setTranslation("");
    setEstimatedInputTokens(null);
    setActualInputTokens(null);
    setOutputTokens(null);
    setTotalTokens(null);

    const text = await file.text();
    setSourceText(text);
    countMutation.mutate({ text, model, targetLanguage });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTranslation("");
    setActualInputTokens(null);
    setOutputTokens(null);
    setTotalTokens(null);

    if (!hasText) {
      setError("Please upload a .txt file first.");
      return;
    }

    translateMutation.mutate({ text: sourceText, model, targetLanguage });
  };

  const handleDownload = () => {
    if (!translation.trim()) {
      setError("No translation to download.");
      return;
    }

    const baseName = fileName?.replace(/\\.txt$/i, "") || "translation";
    const suffix = targetLanguage === "zh" ? "zh" : "en";
    const outputName = `${baseName}-${suffix}.txt`;
    const blob = new Blob([translation], { type: "text/plain;charset=utf-8" });
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

      <form onSubmit={handleSubmit} className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              TXT File
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              className="w-full cursor-pointer rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-gray-200 file:mr-3 file:rounded file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Model
            </label>
            <select
              value={model}
              onChange={event => setModel(event.target.value)}
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
            value={sourceText}
            onChange={event => setSourceText(event.target.value)}
            rows={9}
            placeholder="Upload a .txt file to load its contents here."
            className="w-full resize-y rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-200 placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={!hasText || translateMutation.isPending}
            className="inline-flex items-center justify-center rounded bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {translateMutation.isPending ? "Translating..." : "Translate"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!translation.trim()}
            className="inline-flex items-center justify-center rounded border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download
          </button>
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <span>{countMutation.isPending ? "Counting tokens..." : "Token count ready"}</span>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
          {translation || "Translated text will appear here."}
        </div>
      </section>
    </main>
  );
}
