'use client';

import { useState } from "react";
import { testPark } from "./test-parks";

const TEXT_URL_SPLIT = "@@@@@";

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

type GoogleSearchFieldResult = {
  field: string;
  value: Record<string, string | number>;
  usage?: UsageDetails;
  cost?: CostDetails;
  durationSec: number;
  textWithContext?: string;
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
  googleSearchUsage?: UsageDetails;
  googleSearchCost?: CostDetails;
  googleSearchDurationSec?: number;
  googleSearchDetails?: GoogleSearchFieldResult[];
};

function formatCny(value?: number) {
  return value === undefined ? "N/A" : `¥${value.toFixed(3)}`;
}

function formatSeconds(value?: number) {
  return value === undefined ? "N/A" : `${value.toFixed(1)} s`;
}

function sumNumbers(values: (number | undefined)[]) {
  return values.reduce<number | undefined>((acc, curr) => {
    if (typeof curr !== "number") return acc;
    return (acc ?? 0) + curr;
  }, undefined);
}

function formatFieldName(field: string) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function parseEvidence(source?: string) {
  if (!source) return { text: "", url: "" };
  const [text, url] = source.split(TEXT_URL_SPLIT);
  return { text: text?.trim() ?? "", url: url?.trim() ?? "" };
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
        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Summary</div>
              <h2 className="text-lg font-semibold text-white">Total Time & Total Cost</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-100">
              Aggregate
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-white/10 bg-black/30 p-3">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">总成本 (RMB)</div>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatCny(
                  sumNumbers([
                    result.textCost?.cny.total,
                    result.jsonCost?.cny.total,
                    result.googleSearchCost?.cny.total,
                  ]),
                )}
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/30 p-3">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">总时间</div>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatSeconds(
                  sumNumbers([
                    result.textDurationSec,
                    result.jsonDurationSec,
                    result.googleSearchDurationSec,
                  ]),
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <section className="mt-6 space-y-5">
          {result.json ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">Final Result</h2>
              <pre className="overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-gray-100">
                {JSON.stringify(result.json, null, 2)}
              </pre>
              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Cost</div>
                <p className="mt-1">Total RMB: <strong className="text-white">{formatCny(result.jsonCost?.cny.total)}</strong></p>
                <p className="mt-1">Processing time: <strong className="text-white">{formatSeconds(result.jsonDurationSec)}</strong></p>
              </div>
            </div>
          ) : null}

          {result.text && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-white">Extracted Text</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {result.text}
              </p>
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

          {result.googleSearchDetails || result.googleSearchUsage ? (
            <div className="rounded-lg border border-amber-200/30 bg-amber-200/5 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Google Search</h2>
                  <p className="text-sm text-amber-100/80">
                    Use Google Search to find missing fields in the park info.
                  </p>
                </div>
                {result.googleSearchDetails?.length ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    {result.googleSearchDetails.length} fields
                  </span>
                ) : null}
              </div>

              <div className="mt-3 text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Summary</div>
                <p className="mt-1">
                  Total Cost (RMB):{" "}
                  <strong className="text-white">
                    {formatCny(result.googleSearchCost?.cny.total)}
                  </strong>
                </p>
                <p className="mt-1">
                  Total Time:{" "}
                  <strong className="text-white">
                    {formatSeconds(result.googleSearchDurationSec)}
                  </strong>
                </p>
              </div>

              <div className="mt-2">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                <UsageList usage={result.googleSearchUsage} />
              </div>

              {result.googleSearchDetails?.length ? (
                <div className="mt-4 space-y-3">
                  {result.googleSearchDetails.map((detail) => {
                    const mainValue = detail.value[detail.field];
                    const sourceText = detail.value[`${detail.field}SourceText`];
                    const sourceUrl = detail.value[`${detail.field}SourceUrl`];

                    return (
                      <div
                        key={detail.field}
                        className="rounded border border-amber-200/30 bg-black/40 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-base font-semibold text-white">
                            {formatFieldName(detail.field)}
                          </div>
                          <div className="text-xs text-amber-100/80">
                            Cost time: {formatSeconds(detail.durationSec)}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-200">
                          <span className="text-gray-400">Value:</span>{" "}
                          <span className="font-mono text-xs text-gray-100">
                            {String(mainValue ?? "") || "未找到"}
                          </span>
                        </div>

                        {sourceText && (
                          <div className="mt-2">
                            <div className="text-xs uppercase tracking-[0.08em] text-gray-400">
                              Evidence
                            </div>
                            <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-gray-100">
                              {sourceText}
                            </p>
                            {sourceUrl && (
                              <a
                                href={sourceUrl as string}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center text-xs text-amber-200 underline underline-offset-2"
                              >
                                Source Link
                              </a>
                            )}
                          </div>
                        )}

                        {detail.textWithContext && (
                          <details className="mt-2 rounded border border-white/5 bg-white/5 p-2">
                            <summary className="cursor-pointer text-xs text-gray-300">
                              View Google Search Response
                            </summary>
                            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-gray-100">
                              {detail.textWithContext}
                            </pre>
                          </details>
                        )}

                        <div className="mt-2">
                          <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                          <UsageList usage={detail.usage} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
