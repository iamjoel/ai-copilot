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
  error?: string;
};

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

function GroundingSupports({ metadata }: { metadata?: GroundingMetadata }) {
  const supports = Array.isArray(metadata?.support) ? metadata.support : null;
  const urls = Array.isArray(metadata?.urls) ? metadata.urls : null;

  if ((!supports || supports.length === 0) && (!urls || urls.length === 0)) return null;

  return (
    <div className="mt-3 text-sm">
      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Grounding Supports</div>
      {urls && urls.length > 0 && (
        <div className="mt-1 rounded border border-white/10 bg-black/40 p-3">
          <div className="mb-2 text-gray-400">All urls: </div>
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
                  <span className="text-gray-400">url:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{urls?.[support.urlIndex]}</span>
                </div>
              )}
              {confidenceScores && (
                <div className="text-gray-200">
                  <span className="text-gray-400">confidenceScores:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">
                    {JSON.stringify(confidenceScores)}
                  </span>
                </div>
              )}
              {segmentText && (
                <div className="mt-1 text-gray-200">
                  <span className="text-gray-400">segment.text:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{segmentText}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const testParks = [
  { name: 'Hawf National Reserve', wiki: 'https://en.wikipedia.org/wiki/Hawf_National_Reserve' },
  { name: "Yellowstone National Park", wiki: "https://en.wikipedia.org/wiki/Yellowstone_National_Park" },
  { name: "Yosemite National Park", wiki: "https://en.wikipedia.org/wiki/Yosemite_National_Park" },
]

const testIndex = 0

export default function NationalParksPage() {
  const [parkName, setParkName] = useState(testParks[testIndex].name);
  const [wikiUrl, setWikiUrl] = useState(testParks[testIndex].wiki);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!parkName.trim() || !wikiUrl.trim()) {
      setError("请填写公园名称和 Wikipedia 链接。");
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
      <h1 className="mb-3 text-3xl font-semibold text-white">国家公园信息提取</h1>
      <p className="mb-6 text-sm text-gray-300">
        输入公园名称和其 Wikipedia 链接，API 会联网获取页面文字，提取建立时间并转换成 JSON。每个输出块都会展示用量和人民币总费用。
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          value={parkName}
          onChange={e => setParkName(e.target.value)}
          placeholder="公园名称，如：Hawf National Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <input
          value={wikiUrl}
          onChange={e => setWikiUrl(e.target.value)}
          placeholder="Wikipedia 链接，如：https://en.wikipedia.org/wiki/Hawf_National_Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
          type="url"
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
              <GroundingSupports metadata={result.groundingMetadata} />
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
