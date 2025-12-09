'use client';

import { useState } from "react";
import type { CostDetail, UsageDetail } from "@/lib/usage-utils";
import { GOOGLE_SEARCH_FIELDS, GOOGLE_SEARCH_FIELD_LABELS, type GoogleSearchField } from "../google-search-fields";
import { testPark } from "../test-parks";

type GoogleSearchResult = {
  field: GoogleSearchField;
  value: Record<string, string | number>;
  usage?: UsageDetail;
  cost?: CostDetail;
  durationSec: number;
  textWithContext?: string;
};

function formatCny(value?: number) {
  return value === undefined ? "N/A" : `¥${value.toFixed(3)}`;
}

function formatSeconds(value?: number) {
  return value === undefined ? "N/A" : `${value.toFixed(1)} s`;
}

function UsageList({ usage }: { usage?: UsageDetail }) {
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

export default function GoogleSearchTesterPage() {
  const [parkName, setParkName] = useState(testPark?.name ?? "");
  const [field, setField] = useState<GoogleSearchField>(GOOGLE_SEARCH_FIELDS[1]);
  const [result, setResult] = useState<GoogleSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!parkName?.trim() || !field) {
      setError("Please provide the park name and the field to search.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks/google-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkName, field }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }

      setResult(data.result as GoogleSearchResult);
    } catch (err) {
      console.error("Google search tester page error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">Google Search Missing Field Tester</h1>
      <p className="mb-6 text-sm text-gray-300">
        This page calls <code>google-search-missing-fields.ts</code> directly. Pick one field, provide the park
        name, and inspect the Google search result, evidence, usage, and cost.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          value={parkName}
          onChange={e => setParkName(e.target.value)}
          placeholder="Park name, e.g., Hawf National Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />

        <div className="grid gap-2">
          <label className="text-sm text-gray-300">Field to search</label>
          <select
            value={field}
            onChange={e => setField(e.target.value as GoogleSearchField)}
            className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 focus:border-white/30 focus:outline-none disabled:opacity-60"
            disabled={isLoading}
          >
            {GOOGLE_SEARCH_FIELDS.map(option => (
              <option key={option} value={option}>
                {GOOGLE_SEARCH_FIELD_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Searching..." : "Search Missing Field"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Field</div>
                <div className="text-lg font-semibold text-white">{GOOGLE_SEARCH_FIELD_LABELS[result.field]}</div>
                <div className="text-xs text-gray-400">{result.field}</div>
              </div>
              <div className="text-sm text-gray-200">
                <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Search time</div>
                <div className="text-base font-medium text-white">{formatSeconds(result.durationSec)}</div>
              </div>
            </div>

            <div className="mt-4 rounded border border-white/10 bg-black/40 p-3">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">First pass text</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
                {result.textWithContext ?? "No text returned."}
              </p>
            </div>

            <div className="mt-4 rounded border border-white/10 bg-black/40 p-3">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Value & Evidence</div>
              <div className="mt-2 space-y-2 text-sm text-gray-100">
                {Object.entries(result.value).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="rounded bg-white/5 px-2 py-1 text-xs tracking-[0.08em] text-gray-300">
                      {key}
                    </span>
                    <span className="font-mono text-xs text-gray-100 break-words">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-200">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Cost</div>
              <p className="mt-1">
                Total RMB: <strong className="text-white">{formatCny(result.cost?.cny.total)}</strong>
              </p>
            </div>

            <div className="mt-2">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
              <UsageList usage={result.usage} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
