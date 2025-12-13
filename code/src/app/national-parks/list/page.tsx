/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from "react";
import { progress } from "./progress";

type NationalParkRow = {
  id: string;
  name: string;
  country: string;

  wiki: string;
  wikiUrl: string;
  wikiInputToken: number | null;
  wikiOutputToken: number | null;
  wikiUrlToken: number | null;
  wikiProcessTime: number | null;

  officialWebsite: string;
  officialWebsiteSourceText: string;
  officialWebsiteSourceUrl: string;

  level: number;
  levelSourceText: string;
  levelSourceUrl: string;

  speciesCount: number;
  speciesCountSourceText: string;
  speciesCountSourceUrl: string;

  endangeredSpecies: number;
  endangeredSpeciesSourceText: string;
  endangeredSpeciesSourceUrl: string;

  forestCoverage: number;
  forestCoverageSourceText: string;
  forestCoverageSourceUrl: string;

  area: number;
  areaSourceText: string;
  areaSourceUrl: string;

  establishedYear: number;
  establishedYearSourceText: string;
  establishedYearSourceUrl: string;

  internationalCert: number;
  internationalCertSourceText: string;
  internationalCertSourceUrl: string;

  annualVisitors: number;
  annualVisitorsSourceText: string;
  annualVisitorsSourceUrl: string;
};

type ListResponse = {
  total: number;
  items: NationalParkRow[];
  error?: string;
};

const CSV_COLUMNS: Array<keyof NationalParkRow> = [
  "id",
  "name",
  "country",
  "wiki",
  "wikiUrl",
  "wikiInputToken",
  "wikiOutputToken",
  "wikiUrlToken",
  "wikiProcessTime",
  "officialWebsite",
  "officialWebsiteSourceText",
  "officialWebsiteSourceUrl",
  "level",
  "levelSourceText",
  "levelSourceUrl",
  "speciesCount",
  "speciesCountSourceText",
  "speciesCountSourceUrl",
  "endangeredSpecies",
  "endangeredSpeciesSourceText",
  "endangeredSpeciesSourceUrl",
  "forestCoverage",
  "forestCoverageSourceText",
  "forestCoverageSourceUrl",
  "area",
  "areaSourceText",
  "areaSourceUrl",
  "establishedYear",
  "establishedYearSourceText",
  "establishedYearSourceUrl",
  "internationalCert",
  "internationalCertSourceText",
  "internationalCertSourceUrl",
  "annualVisitors",
  "annualVisitorsSourceText",
  "annualVisitorsSourceUrl",
];

export default function NationalParkListPage() {
  const [country, setCountry] = useState(progress[progress.findIndex(c => !c.done)]?.name || '');
  const [name, setName] = useState("");
  const [result, setResult] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupeMessage, setDedupeMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const params = new URLSearchParams();
    if (country.trim()) params.set("country", country.trim());
    if (name.trim()) params.set("name", name.trim());

    setIsLoading(true);
    try {
      const response = await fetch(`/api/national-parks/list?${params.toString()}`, {
        method: "GET",
      });
      const data = (await response.json()) as ListResponse;
      if (!response.ok) {
        setError(data.error ?? "Request failed.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("National park list page error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      "name",
      "wiki",
      "Ecological Integrity",
      "Governance Resilience",
      "Nature Immersion",
    ],
    [],
  );

  const formatCsvValue = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const strValue = String(value).replace(/"/g, '""');
    return `"${strValue}"`;
  };

  const getCsvFileName = () => {
    const trimmedCountry = country.trim();
    if (!trimmedCountry) return "national-parks.csv";
    const safeCountry = trimmedCountry.replace(/[\\/:*?"<>|]/g, "").trim();
    return `${safeCountry || "national-parks"}.csv`;
  };

  const handleExportCsv = () => {
    if (!result || result.items.length === 0) return;

    const header = CSV_COLUMNS.join(",");
    const rows = result.items.map(item =>
      CSV_COLUMNS.map(col => formatCsvValue(item[col])).join(","),
    );
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getCsvFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDedupeCountry = async () => {
    const trimmedCountry = country.trim();
    if (!trimmedCountry) {
      setDedupeMessage("请输入国家名称再去重。");
      return;
    }

    setIsDeduping(true);
    setDedupeMessage(null);
    try {
      const response = await fetch("/api/national-parks/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: trimmedCountry }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDedupeMessage(data.error ?? "去重失败，请稍后再试。");
      } else {
        setDedupeMessage(`国家 ${data.country} 移除 ${data.removed} 条重复记录。`);
        await handleSubmit({ preventDefault: () => { } } as React.FormEvent<HTMLFormElement>);
      }
    } catch (dedupeError) {
      console.error("Deduplicate country error:", dedupeError);
      setDedupeMessage("网络错误，去重失败。");
    } finally {
      setIsDeduping(false);
    }
  };

  const renderField = (item: NationalParkRow, col: string) => {
    const value = (item as any)[col];
    const sourceText = (item as any)[`${col}SourceText`];
    const sourceUrl = (item as any)[`${col}SourceUrl`];
    return (
      <div>
        <div>{col}:{value}</div>
        {!!sourceText && (
          <div>
            <span>Source</span>: <a href={sourceUrl} target="_blank">{sourceText}</a>
          </div>
        )}
      </div>
    )
  }

  const renderRow = (item: NationalParkRow) => {
    const official = item.officialWebsite;
    const tdClassName = "border border-white/10 px-2 py-2 align-top"
    return (
      <tr key={item.name} className="odd:bg-white/5">
        <td className={tdClassName}>
          {official ? (
            <a
              href={official}
              target="_blank"
              rel="noreferrer"
              className="text-amber-200 underline underline-offset-2 block"
            >
              {item.name}
            </a>
          ) : (
            <div className="max-w-[300px] whitespace-pre-wrap break-words">{item.name}</div>
          )}
          <a
            href={item.wikiUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-blue-400 underline underline-offset-2"
          >
            wiki
          </a>
        </td>
        <td className="align-top">
          {item.wiki.split("\n").map((line, idx) => (
            <p key={idx} className="mb-1 last:mb-0">
              {line}
            </p>
          ))}
        </td>
        <td className={tdClassName}>
          {/* Ecological Integrity */}
          <div className="space-y-2">
            {renderField(item, "level")}
            {renderField(item, "speciesCount")}
            {renderField(item, "endangeredSpecies")}
            {renderField(item, "forestCoverage")}
          </div>
        </td>
        <td className={tdClassName}>
          {/* Governance Resilience */}
          <div className="space-y-2">
            {renderField(item, "area")}
            {renderField(item, "establishedYear")}
            {renderField(item, "internationalCert")}
          </div>
        </td>
        <td className={tdClassName}>
          {/* Nature Immersion */}
          {renderField(item, "annualVisitors")}
        </td>
      </tr>
    )
  }

  return (
    <main className="mx-auto w-[95vw] px-4 py-8 text-gray-100">
      <h1 className="mb-3 text-3xl font-semibold text-white">National Park List</h1>
      <p className="mb-6 text-sm text-gray-300">
        Filter by country and/or park name. Returns fields in schema order (excluding id, createdAt, updatedAt).
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div className="grid gap-2">
          <label className="text-sm text-gray-300">Country</label>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="e.g., Yemen"
            className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-300">Park Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Hawf"
            className="w-full rounded border border-white/10 bg-white/5 p-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
            disabled={isLoading}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded bg-white px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Load List"}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-200">
        <button
          type="button"
          onClick={handleDedupeCountry}
          disabled={isDeduping || isLoading || !country.trim()}
          className="rounded border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeduping ? "去重中..." : "去重当前国家重复项"}
        </button>
        {dedupeMessage && (
          <span className="text-xs text-emerald-300">{dedupeMessage}</span>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-200">
            <div>
              Total: <span className="font-semibold text-white">{result.total}</span>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!result.items.length}
              className="rounded border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-auto rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-white">Results</h2>
            <div className="min-w-full overflow-auto">
              <table className="w-full min-w-[1200px] border-collapse text-left text-xs text-gray-100">
                <thead>
                  <tr className="bg-white/10 text-[11px] uppercase tracking-[0.08em] text-gray-300">
                    {columns.map(col => {
                      const otherInfo = (() => {
                        if (col === "an") return " (links to official website if available)";
                        if (col.endsWith("SourceText")) return " (clickable to source URL if available)";
                        return "";
                      })();
                      return (
                        <th key={col} className="border border-white/10 px-2 py-2">
                          {col}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map(renderRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
      }
    </main >
  );
}
