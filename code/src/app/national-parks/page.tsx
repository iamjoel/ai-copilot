'use client';

import { useState } from "react";
import { testPark } from "./test-parks";

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

type GroundingMetadata = {
  urls?: string[];
  support?: {
    text?: string;
    urlIndex?: number;
    confidenceScores?: number;
  }[];
};

type ExtractResponse = {
  text?: string;
  json?: unknown;
  textUsage?: UsageDetails;
  jsonUsage?: UsageDetails;
  textCost?: CostDetails;
  jsonCost?: CostDetails;
  groundingMetadata?: GroundingMetadata;
  textDurationSec?: number;
  jsonDurationSec?: number;
  error?: string;
};

function formatCny(value?: number) {
  return value === undefined ? "N/A" : `¥${value.toFixed(3)}`;
}

function formatSeconds(value?: number) {
  return value === undefined ? "N/A" : `${value.toFixed(1)} s`;
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

function GroundingSupports({ metadata }: { metadata?: GroundingMetadata }) {
  const supports = Array.isArray(metadata?.support) ? metadata.support : null;
  const urls = Array.isArray(metadata?.urls) ? metadata.urls : null;

  if ((!supports || supports.length === 0) && (!urls || urls.length === 0)) return null;

  return (
    <div className="mt-3 text-sm">
      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Grounding Supports</div>
      {urls && urls.length > 0 && (
        <div className="mt-1 rounded border border-white/10 bg-black/40 p-3">
          <div className="mb-2 text-gray-400">All URLs: </div>
          <div className="mb-1 font-mono text-xs text-gray-100 break-words">{urls.join(',')}</div>
        </div>
      )}

      <div className="mt-2 space-y-2">
        {supports?.map((support, idx) => {
          const confidenceScores = support.confidenceScores;
          const segmentText = support.text;

          return (
            <div key={idx} className="rounded border border-white/10 bg-black/40 p-3">
              {typeof support.urlIndex === "number" && (
                <div className="text-gray-200">
                  <span className="text-gray-400">URL:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{urls?.[support.urlIndex]}</span>
                </div>
              )}
              {segmentText && (
                <div className="mt-1 text-gray-200">
                  <span className="text-gray-400">Source:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{segmentText}</span>
                </div>
              )}
              {confidenceScores && (
                <div className="text-gray-200">
                  <span className="text-gray-400">Confidence Scores:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">
                    {JSON.stringify(confidenceScores)}
                  </span>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function NationalParksPage() {
  const [parkName, setParkName] = useState(testPark?.name);
  const [wikiUrl, setWikiUrl] = useState(testPark?.wiki);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!parkName?.trim() || !wikiUrl?.trim()) {
      setError("Please provide both the park name and its Wikipedia link.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkName, wikiUrl }),
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
      <h1 className="mb-3 text-3xl font-semibold text-white">National Park Info Extractor</h1>
      <p className="mb-6 text-sm text-gray-300">
        Enter a park name and its Wikipedia link. The API will fetch the page, extract the establishment year,
        and return JSON. Each output block shows usage and total cost in RMB.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          value={parkName}
          onChange={e => setParkName(e.target.value)}
          placeholder="Park name, e.g., Hawf National Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <input
          value={wikiUrl}
          onChange={e => setWikiUrl(e.target.value)}
          placeholder="Wikipedia URL, e.g., https://en.wikipedia.org/wiki/Hawf_National_Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
          type="url"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Processing..." : "Extract National Park Info"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 space-y-5">
          {result.text && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">Extracted Text</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {result.text}
              </p>
              <GroundingSupports metadata={result.groundingMetadata} />
              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Cost</div>
                <p className="mt-1">Total RMB: <strong className="text-white">{formatCny(result.textCost?.cny.total)}</strong></p>
                <p className="mt-1">Processing time: <strong className="text-white">{formatSeconds(result.textDurationSec)}</strong></p>
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                <UsageList usage={result.textUsage} />
              </div>
            </div>
          )}

          {result.json ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">JSON</h2>
              <pre className="overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-gray-100">
                {JSON.stringify(result.json, null, 2)}
              </pre>
              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Cost</div>
                <p className="mt-1">Total RMB: <strong className="text-white">{formatCny(result.jsonCost?.cny.total)}</strong></p>
                <p className="mt-1">Processing time: <strong className="text-white">{formatSeconds(result.jsonDurationSec)}</strong></p>
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                <UsageList usage={result.jsonUsage} />
              </div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
