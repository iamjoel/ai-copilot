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
const defaultPrompt = `Based on the document: https://en.wikipedia.org/wiki/Hawf_National_Reserve
          Which year did the park get established? If find the answer, provide the original sentence or paragraph as well.`;

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
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Gemini Flash Usage Demo
      </h1>
      <p style={{ marginBottom: "1.5rem", color: "#555" }}>
        Submit a prompt to call <code>/api/usage</code> and view the model response,
        response time, and usage details.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="Enter your prompt"
          style={{ padding: "0.75rem", fontSize: "1rem", resize: "vertical" }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Sending..." : "Send to Gemini 2.5 Flash Lite"}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: "1rem", color: "#c00" }}>
          {error}
        </p>
      )}

      {result && (
        <section
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Response
          </h2>
          {result.text && (
            <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.5rem" }}>
              {result.text}
            </p>
          )}
          {result.cost && (
            <div style={{ marginTop: "0.75rem" }}>
              <strong>Estimated cost:</strong>
              <div style={{ display: "flex", marginTop: "0.35rem" }}>
                <div>
                  <em style={{ fontStyle: "normal", color: "#444" }}>USD</em>
                  <ul style={{ listStyle: "disc", marginLeft: "1.25rem" }}>
                    <li>Input: {formatUsd(result.cost.usd.input)}</li>
                    <li>Output: {formatUsd(result.cost.usd.output)}</li>
                    <li>URL: {formatUsd(result.cost.usd.url)}</li>
                    <li>
                      Total: <strong>{formatUsd(result.cost.usd.total)}</strong>
                    </li>
                  </ul>
                </div>
                <div>
                  <em style={{ fontStyle: "normal", color: "#444" }}>RMB</em>
                  <ul style={{ listStyle: "disc", marginLeft: "1.25rem" }}>
                    <li>Input: {formatCny(result.cost.cny.input)}</li>
                    <li>Output: {formatCny(result.cost.cny.output)}</li>
                    <li>URL: {formatCny(result.cost.cny.url)}</li>
                    <li>
                      Total: <strong>{formatCny(result.cost.cny.total)}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {typeof result.responseTimeMs === "number" && (
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Response time:</strong> {result.responseTimeMs} ms
            </p>
          )}
          {result.usage && (
            <div style={{ marginTop: "0.75rem" }}>
              <strong>Usage:</strong>
              <ul style={{ listStyle: "disc", marginLeft: "1.25rem" }}>
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
              <details style={{ marginTop: "0.5rem" }}>
                <summary style={{ cursor: "pointer" }}>Raw usage payload</summary>
                <pre
                  style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    padding: "0.75rem",
                    overflow: "auto",
                    marginTop: "0.5rem",
                  }}
                >
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
