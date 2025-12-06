'use client';

import { useState } from "react";

type UsageDetails = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  raw?: unknown;
};

type UsageResponse = {
  text?: string;
  responseTimeMs?: number;
  usage?: UsageDetails;
  error?: string;
};

export default function UsagePage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<UsageResponse | null>(null);
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
