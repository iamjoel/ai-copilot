'use client';

import { useState } from "react";
import { testPark } from "../test-parks";

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
  rates?: {
    usdPerToken: {
      input: number;
      output: number;
      url: number;
    };
    usdToCny: number;
  };
};

type ExtractResponse = {
  text?: string;
  json?: unknown;
  createdId?: string;
  textUsage?: UsageDetails;
  jsonUsage?: UsageDetails;
  textCost?: CostDetails;
  jsonCost?: CostDetails;
  groundingMetadata?: unknown;
  textDurationSec?: number;
  jsonDurationSec?: number;
  error?: string;
};

export default function ExtractWikiTesterPage() {
  const [name, setName] = useState(testPark?.name ?? "");
  const [country, setCountry] = useState(testPark?.country ?? "");
  const [wikiUrl, setWikiUrl] = useState(testPark?.wiki ?? "");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!name?.trim() || !country?.trim() || !wikiUrl?.trim()) {
      setError("Please provide the park name, country, and Wikipedia link.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks/extract/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country, wikiUrl }),
      });

      const data = (await response.json()) as ExtractResponse;

      if (!response.ok) {
        setError(data.error ?? "Request failed.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Extract wiki tester page error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">Extract Wiki Tester</h1>
      <p className="mb-6 text-sm text-gray-300">
        Call <code>/api/national-parks/extract/wiki</code> with name, country, and wikiUrl. The API extracts
        wiki content, turns it into structured JSON, and writes to the database (create or update).
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Park name, e.g., Yellowstone National Park"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <input
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder="Country, e.g., United States"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <input
          value={wikiUrl}
          onChange={e => setWikiUrl(e.target.value)}
          placeholder="Wikipedia URL, e.g., https://en.wikipedia.org/wiki/Yellowstone_National_Park"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
          type="url"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Processing..." : "Run Extract"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 space-y-5">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {JSON.stringify(result, null, 2)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
