'use client';

import { useState } from "react";

type UsageDetails = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  urlTokens?: number;
  raw?: unknown;
};

type CurrencyCost = {
  input: number;
  output: number;
  url: number;
  total: number;
};

type CostDetails = {
  usd: CurrencyCost;
  cny: CurrencyCost;
};

type ExtractResponse = {
  text?: string;
  json?: unknown;
  textUsage?: UsageDetails;
  jsonUsage?: UsageDetails;
  textCost?: CostDetails;
  jsonCost?: CostDetails;
  error?: string;
};

const defaultPrompt = `You are a data extraction assistant.

Your ONLY knowledge source is the content of the webpage loaded via the url_context tool.
Treat anything outside the tool output as UNKNOWN.

Document URL:
- https://en.wikipedia.org/wiki/Hawf_National_Reserve

Goal:
Find how the park's establishment time ("Established" year) is described on this page.

Instructions:
1. Use the url_context tool to read the page.
2. Search for any part of the page that explicitly mentions when the park was established
  (for example, an infobox row named "Established" or a sentence stating the year).
3. If you find such information, copy the minimal surrounding text VERBATIM from the page:
  - Prefer the table row or sentence that contains the date.
  - Include at most 3 short lines or 1–2 sentences.
4. If the page does NOT explicitly state an establishment year, respond exactly with:
  NO_ESTABLISHED_YEAR_FOUND

Output format:
- If found: only output the verbatim excerpt from the page, no extra explanation.
- If not found: only output "NO_ESTABLISHED_YEAR_FOUND".

Hard constraints:
- Do NOT guess or infer any dates.
- Do NOT use common knowledge, training data, or other websites.
- Base your answer strictly on the text returned by url_context.`;

function formatCny(value?: number) {
  return value === undefined ? "N/A" : `¥${value.toFixed(6)}`;
}

function UsageList({ usage }: { usage?: UsageDetails }) {
  if (!usage) return null;

  return (
    <ul className="mt-1 list-disc pl-5 text-sm text-gray-200">
      <li>Input tokens: {usage.inputTokens ?? "N/A"}</li>
      <li>Output tokens: {usage.outputTokens ?? "N/A"}</li>
      <li>URL tokens: {usage.urlTokens ?? "N/A"}</li>
      <li>Total tokens: {usage.totalTokens ?? "N/A"}</li>
    </ul>
  );
}

export default function NationalParksPage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!prompt.trim()) {
      setError("Prompt is required.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = (await response.json()) as ExtractResponse;

      if (!response.ok) {
        setError(data.error ?? "Request failed.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("National parks page error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">国家公园信息提取</h1>
      <p className="mb-6 text-sm text-gray-300">
        提交一个包含网页链接的 prompt，API 会先联网获取文字内容，然后将文字转换成 JSON。每个输出块都会展示用量和人民币总费用。
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
          placeholder="Enter your prompt"
          className="w-full resize-y rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Processing..." : "提取国家公园信息"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 space-y-5">
          {result.text && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">文字内容</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {result.text}
              </p>
              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">费用</div>
                <p className="mt-1">RMB 总费用: <strong className="text-white">{formatCny(result.textCost?.cny.total)}</strong></p>
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                <UsageList usage={result.textUsage} />
              </div>
            </div>
          )}

          {result.json && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">JSON</h2>
              <pre className="overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-gray-100">
                {JSON.stringify(result.json, null, 2)}
              </pre>
              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">费用</div>
                <p className="mt-1">RMB 总费用: <strong className="text-white">{formatCny(result.jsonCost?.cny.total)}</strong></p>
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                <UsageList usage={result.jsonUsage} />
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
