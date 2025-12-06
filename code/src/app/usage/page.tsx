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
  rates: {
    usdPerToken: {
      input: number;
      output: number;
      url: number;
    };
    usdToCny: number;
  };
};

type UsageResponse = {
  text?: string;
  responseTimeMs?: number;
  usage?: UsageDetails;
  cost?: CostDetails;
  error?: string;
};

/*
* The document does not mention the establishment year of Hawf National Reserve. However, it states that "The Hawf Area was nominated as a natural UNESCO World Heritage Site in August 2002. Currently, it is listed as a tentative World Heritage Site."

Estimated cost (USD):
Total: $0.001504
Response time: 3138 ms

Usage:
Input tokens: 46
Output tokens: 76
URL tokens: 14694
Total tokens: 14816

Input tokens: 46
Output tokens: 56
URL tokens: 14694
Total tokens: 14796
*/
const defaultPrompt = `You are an expert in extracting structured information from unstructured text.

Only use the content from the given webpage. Do not rely on common knowledge, memory, or any other external sources.

Document: https://en.wikipedia.org/wiki/Hawf_National_Reserve

Task:
Extract the year when the park was established (“Established” year).

Requirements:
- Return a single four-digit year.
- If the webpage does not explicitly provide an establishment year, return -1.
- Do not guess or infer information that is not directly stated in the document.
`;

export default function UsagePage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatUsd = (value?: number) =>
    value === undefined ? "N/A" : `$${value.toFixed(6)}`;
  const formatCny = (value?: number) =>
    value === undefined ? "N/A" : `¥${value.toFixed(6)}`;

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
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = (await response.json()) as UsageResponse;

      if (!response.ok) {
        setError(data.error ?? "Request failed.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Usage page error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">Gemini Flash Usage Demo</h1>
      <p className="mb-6 text-sm text-gray-300">
        Submit a prompt to call{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.95em] text-gray-100">/api/usage</code>{" "}
        and view the model response, response time, and usage details.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="Enter your prompt"
          className="w-full resize-y rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Sending..." : "Send to Gemini 2.5 Flash Lite"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-white">Response</h2>
          {result.text && (
            <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
              {result.text}
            </p>
          )}
          {result.cost && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Estimated cost</div>
              <div className="mt-3 flex gap-10 text-sm text-gray-200">
                <div>
                  <span className="text-gray-300">USD</span>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Input: {formatUsd(result.cost.usd.input)}</li>
                    <li>Output: {formatUsd(result.cost.usd.output)}</li>
                    <li>URL: {formatUsd(result.cost.usd.url)}</li>
                    <li>
                      Total: <strong className="text-white">{formatUsd(result.cost.usd.total)}</strong>
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="text-gray-300">RMB</span>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Input: {formatCny(result.cost.cny.input)}</li>
                    <li>Output: {formatCny(result.cost.cny.output)}</li>
                    <li>URL: {formatCny(result.cost.cny.url)}</li>
                    <li>
                      Total: <strong className="text-white">{formatCny(result.cost.cny.total)}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {typeof result.responseTimeMs === "number" && (
            <p className="my-2 text-sm text-gray-200">
              <strong className="text-white">Response time:</strong> {result.responseTimeMs} ms
            </p>
          )}
          {result.usage && (
            <div className="mt-3 text-gray-200">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
              <ul className="mt-1 list-disc pl-5 text-sm">
                <li>
                  Input tokens: {result.usage.inputTokens ?? "N/A"}
                </li>
                <li>
                  Output tokens: {result.usage.outputTokens ?? "N/A"}
                </li>
                <li>
                  URL tokens: {result.usage.urlTokens ?? "N/A"}
                </li>
                <li>
                  Total tokens: {result.usage.totalTokens ?? "N/A"}
                </li>
              </ul>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-gray-100">
                  Raw usage payload
                </summary>
                <pre className="mt-2 overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-gray-100">
                  {JSON.stringify(result.usage.raw, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
