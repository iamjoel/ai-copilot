'use client';

import { useState } from "react";
import type { GoogleSearchField } from "../google-search-fields";
import { GOOGLE_SEARCH_FIELD_LABELS } from "../google-search-fields";
import type { GoogleSearchFieldResult } from "@/app/api/national-parks/extract/service/google-search-missing-fields";
import { testPark } from "../test-parks";

type SearchMissingFieldsResponse = {
  parkId?: string;
  missingFields?: GoogleSearchField[];
  updates?: Record<string, string | number>;
  searchResults?: GoogleSearchFieldResult[];
  message?: string;
};

function formatCny(value?: number) {
  return value === undefined ? "N/A" : `¥${value.toFixed(3)}`;
}

function formatSeconds(value?: number) {
  return value === undefined ? "N/A" : `${value.toFixed(1)} s`;
}

function isNonEmptyRecord(record?: Record<string, string | number>) {
  return !!record && Object.keys(record).length > 0;
}

function UsageList({ usage }: { usage?: GoogleSearchFieldResult["usage"] }) {
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

export default function SearchMissingFieldsTesterPage() {
  const [parkName, setParkName] = useState(testPark?.name ?? "");
  const [result, setResult] = useState<SearchMissingFieldsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!parkName?.trim()) {
      setError("Please enter a park name.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/national-parks/search-missing-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkName }),
      });

      const data = (await response.json()) as SearchMissingFieldsResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Search missing fields tester error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">Missing Fields Autofill Tester</h1>
      <p className="mb-6 text-sm text-gray-300">
        This page calls <code>/api/national-parks/search-missing-fields</code>. Provide a national park name that
        already exists in the database; the API will check which metric fields are missing, call Google search
        per field if &le; 3 entries are missing, and then persist the values.
      </p>

      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-3">
        <input
          value={parkName}
          onChange={event => setParkName(event.target.value)}
          placeholder="Park name, e.g., Hawf National Reserve"
          className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Checking..." : "Search & Autofill Missing Fields"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-6 space-y-6">
          {result.message && (
            <p className="rounded border border-white/10 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {result.message}
            </p>
          )}

          {result.missingFields && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-gray-400">Missing Fields</p>
                  <h2 className="text-lg font-semibold text-white">{result.missingFields.length}</h2>
                </div>
                {result.parkId && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-100">
                    Park ID: {result.parkId}
                  </span>
                )}
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {result.missingFields.map(field => (
                  <li key={field} className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100">
                    <span className="block text-xs uppercase tracking-[0.12em] text-gray-400">{field}</span>
                    <span className="text-base text-white">{GOOGLE_SEARCH_FIELD_LABELS[field]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isNonEmptyRecord(result.updates) && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Database Update Payload</div>
              <pre className="mt-3 max-h-80 overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-gray-100">
                {JSON.stringify(result.updates, null, 2)}
              </pre>
            </div>
          )}

          {result.searchResults && result.searchResults.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-gray-400">Google Search Runs</p>
                <h2 className="text-lg font-semibold text-white">
                  Filled {result.searchResults.length} field{result.searchResults.length > 1 ? "s" : ""}
                </h2>
              </div>
              {result.searchResults.map(searchResult => (
                <article
                  key={`${searchResult.field}-${searchResult.durationSec}-${searchResult.textWithContext?.length ?? 0}`}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-gray-400">Field</p>
                      <h3 className="text-lg font-semibold text-white">
                        {GOOGLE_SEARCH_FIELD_LABELS[searchResult.field as GoogleSearchField] ?? searchResult.field}
                      </h3>
                      <p className="text-xs text-gray-400">{searchResult.field}</p>
                    </div>
                    <div className="text-sm text-gray-200">
                      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Search time</div>
                      <div className="text-base font-medium text-white">{formatSeconds(searchResult.durationSec)}</div>
                    </div>
                    <div className="text-sm text-gray-200">
                      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Cost</div>
                      <div className="text-base font-medium text-white">
                        {formatCny(searchResult.cost?.cny.total)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded border border-white/10 bg-black/40 p-3">
                    <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Value & Evidence</div>
                    <div className="mt-2 space-y-2 text-sm text-gray-100">
                      {Object.entries(searchResult.value).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="rounded bg-white/5 px-2 py-1 text-xs tracking-[0.08em] text-gray-300">
                            {key}
                          </span>
                          <span className="font-mono text-xs text-gray-100 break-words">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {searchResult.textWithContext && (
                    <div className="mt-4 rounded border border-white/10 bg-black/40 p-3">
                      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Raw response</div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
                        {searchResult.textWithContext}
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Usage</div>
                    <UsageList usage={searchResult.usage} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
