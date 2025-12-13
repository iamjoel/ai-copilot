'use client';

import { useEffect, useRef, useState } from "react";
import { progress } from "../list/progress";

type BatchResult = {
  country: string;
  total: number;
  success: number;
  failure: number;
  failureList: unknown[];
  [key: string]: unknown;
};

type SectionState = {
  countryName: string;
  result: BatchResult | null;
  error: string | null;
  isLoading: boolean;
};

const MAX_SECTIONS = 20;

const buildInitialSections = (): SectionState[] => {
  const unfinishedCountries = progress.filter(item => !item.done).slice(0, MAX_SECTIONS).map(item => item.name);
  while (unfinishedCountries.length < MAX_SECTIONS) {
    unfinishedCountries.push("");
  }

  return unfinishedCountries.map(country => ({
    countryName: country,
    result: null,
    error: null,
    isLoading: false,
  }));
};

export default function ExtractWikiBatchTester() {
  const [sections, setSections] = useState<SectionState[]>(() => buildInitialSections());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const sectionsRef = useRef<SectionState[]>(sections);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const updateSection = (index: number, updater: (section: SectionState) => SectionState) => {
    setSections(prev => {
      const next = [...prev];
      const current = next[index] ?? { countryName: "", result: null, error: null, isLoading: false };
      next[index] = updater(current);
      return next;
    });
  };

  const runBatchForSection = async (index: number): Promise<void> => {
    const currentSection = sectionsRef.current[index];
    const trimmedCountry = currentSection?.countryName.trim() ?? "";
    if (!trimmedCountry) {
      updateSection(index, section => ({
        ...section,
        error: "Please enter a country name before running.",
      }));
      return;
    }

    updateSection(index, section => ({
      ...section,
      isLoading: true,
      error: null,
      result: null,
    }));

    try {
      const response = await fetch("/api/national-parks/extract/wiki/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryName: trimmedCountry }),
      });

      const data = (await response.json()) as BatchResult;
      if (!response.ok) {
        updateSection(index, section => ({
          ...section,
          error: (data as { error?: string }).error ?? "Request failed.",
        }));
      } else {
        updateSection(index, section => ({
          ...section,
          result: data,
          error: null,
        }));
      }
    } catch (err) {
      console.error(`Batch tester error for ${trimmedCountry}:`, err);
      updateSection(index, section => ({
        ...section,
        error: "Network error. Please try again.",
      }));
    } finally {
      updateSection(index, section => ({
        ...section,
        isLoading: false,
      }));
    }
  };

  const handleRunAll = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    try {
      await Promise.all(sectionsRef.current.map((_, index) => runBatchForSection(index)));
    } finally {
      setIsRunningAll(false);
    }
  };

  const anySectionLoading = sections.some(section => section.isLoading);

  const getSectionTone = (section: SectionState) => {
    if (section.result) {
      return section.result.success === section.result.total ? "success" : "failure";
    }
    if (section.error) {
      return "failure";
    }
    return "default";
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-gray-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-white">Batch Extract Wiki Tester</h1>
          <p className="mt-2 text-sm text-gray-300">
            Uses <code>/api/national-parks/extract/wiki/batch</code> to process CSV entries under{" "}
            <code>datas/&lt;country&gt;.csv</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunAll}
          disabled={isRunningAll || anySectionLoading}
          className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunningAll ? "Running All..." : "Run All"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section, index) => {
          const tone = getSectionTone(section);
          const isSuccess = tone === "success";
          const cardClass = [
            "rounded-lg border p-4 shadow-sm transition",
            tone === "success"
              ? "border-emerald-400/70 bg-emerald-500/10"
              : tone === "failure"
                ? "border-red-400/70 bg-red-500/5"
                : "border-white/10 bg-white/5",
          ].join(" ");
          return (
            <div key={index} className={cardClass}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Batch #{index + 1}</p>
                  <p className="text-sm text-gray-200">Country {section.countryName ? `• ${section.countryName}` : ""}</p>
                </div>
                {isSuccess ? (
                  <span className="text-xs font-semibold text-emerald-300">Completed</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => runBatchForSection(index)}
                    disabled={section.isLoading}
                    className="rounded border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {section.isLoading ? "Running..." : "Run"}
                  </button>
                )}
              </div>

              <input
                value={section.countryName}
                onChange={event =>
                  updateSection(index, prev => ({
                    ...prev,
                    countryName: event.target.value,
                  }))
                }
                placeholder="Country name, e.g., Yemen"
                className="mb-3 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
                disabled={section.isLoading || isRunningAll}
              />

              {section.error && <p className="mb-3 text-xs text-red-400">{section.error}</p>}

              {section.result && (
                <div className="text-xs text-gray-100">
                  <p className="mb-1 font-semibold text-white">Response JSON</p>
                  <pre className="max-h-64 overflow-auto rounded border border-white/10 bg-black/40 p-3">
                    {JSON.stringify(section.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
