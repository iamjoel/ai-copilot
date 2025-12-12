'use client';

import { useState } from "react";
import { progress } from "../list/progress";

type BatchResult = unknown;

export default function ExtractWikiBatchTester() {
  const [countryName, setCountryName] = useState(progress[progress.findIndex(c => !c.done)].name);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!countryName.trim()) {
      setError("Please enter a country name.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks/extract/wiki/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryName }),
      });

      const data = (await response.json()) as BatchResult;
      if (!response.ok) {
        setError((data as { error?: string }).error ?? "Request failed.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Batch tester error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">Batch Extract Wiki Tester</h1>
      <p className="mb-6 text-sm text-gray-300">
        Call <code>/api/national-parks/extract/wiki/batch</code> with a country name. The API reads the matching
        CSV under <code>datas/&lt;country&gt;.csv</code>, runs the per-park extractor, and returns the full JSON.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          value={countryName}
          onChange={e => setCountryName(e.target.value)}
          placeholder="Country name, e.g., Yemen"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Processing..." : "Run Batch Extract"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-white">Response JSON</h2>
          <pre className="overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-gray-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
