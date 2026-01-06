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

export default function TranslatePage() {
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [model, setModel] = useState(modelGroups[0].options[0].value);
  const [targetLanguage, setTargetLanguage] = useState<"en" | "zh">("en");
  const [translation, setTranslation] = useState("");
  const [inputTokens, setInputTokens] = useState<number | null>(null);
  const [outputTokens, setOutputTokens] = useState<number | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasText = sourceText.trim().length > 0;

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
      setInputTokens(data.inputTokens ?? null);
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
            setInputTokens(event.inputTokens ?? null);
          } else if (event.type === "delta") {
            setTranslation(prev => prev + event.text);
          } else if (event.type === "done") {
            setInputTokens(event.inputTokens ?? null);
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

  const tokenSummary = useMemo(
    () => [
      { label: "Input tokens", value: inputTokens },
      { label: "Output tokens", value: outputTokens },
      { label: "Total tokens", value: totalTokens },
    ],
    [inputTokens, outputTokens, totalTokens],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);
    setTranslation("");
    setOutputTokens(null);
    setTotalTokens(null);

    const text = await file.text();
    setSourceText(text);
    setInputTokens(null);
    countMutation.mutate({ text, model, targetLanguage });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTranslation("");
    setOutputTokens(null);
    setTotalTokens(null);

    if (!hasText) {
      setError("Please upload a .txt file first.");
      return;
    }

    translateMutation.mutate({ text: sourceText, model, targetLanguage });
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
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <span>{countMutation.isPending ? "Counting tokens..." : "Token count ready"}</span>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Translation</h2>
          <p className="mt-1 text-xs text-gray-400">Output text from the selected model.</p>
        </div>
        <div className="min-h-[160px] max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-4 text-sm text-gray-200">
          {translation || "Translated text will appear here."}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {tokenSummary.map(item => (
            <div key={item.label} className="rounded border border-white/10 bg-black/40 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {item.value ?? "N/A"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
