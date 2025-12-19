/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useMemo, useState } from "react";
import ModelSelector from "@/app/completions/components/ModelSelector";
import { MODEL_GROUPS } from "@/lib/model-presets";
import { Markdown } from "@/lib/markdown/react-markdown";
import { DEBUG_TEST_CASES } from "./test-case";

const DEFAULT_MODEL = MODEL_GROUPS[0]?.options[0]?.value ?? "";
const CUSTOM_TEST_CASE_ID = "__custom_prompt__";

type QualityAnswerResponse = {
  classification: {
    category: string;
    sub_category: string;
    domain: string;
    complexity: number;
    methodology?: string;
    analysis_reasoning?: string;
  };
  strategy: {
    methodology: string;
    rules: string;
  } | null;
  strategyName: string | null;
  domainContext?: string;
  finalPrompt: string;
  answer: string;
  directAnswer: string;
};

export default function QualityAnswerFlowPage() {
  const defaultTestCase = DEBUG_TEST_CASES[0];
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>(
    defaultTestCase?.id ?? CUSTOM_TEST_CASE_ID,
  );
  const [question, setQuestion] = useState(
    defaultTestCase?.userQuery ?? "Enter the question to analyze...",
  );
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [result, setResult] = useState<QualityAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModels = useMemo(() => (selectedModel ? [selectedModel] : []), [selectedModel]);

  const handleModelToggle = (value: string) => {
    setSelectedModel((prev: string) => (prev === value ? "" : value) as any);
  };

  const handleTestCaseChange = (value: string) => {
    setSelectedTestCaseId(value);
    if (value === CUSTOM_TEST_CASE_ID) return;
    const targetCase = DEBUG_TEST_CASES.find(test => test.id === value);
    if (targetCase) {
      setQuestion(targetCase.userQuery);
    }
  };

  const handleQuestionInput = (value: string) => {
    setQuestion(value);
    if (selectedTestCaseId !== CUSTOM_TEST_CASE_ID) {
      setSelectedTestCaseId(CUSTOM_TEST_CASE_ID);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) {
      setError("Please enter a question first.");
      return;
    }
    if (!selectedModel) {
      setError("Please select a model.");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/quality-answer-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, model: selectedModel }),
      });
      const data = (await response.json()) as QualityAnswerResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 py-12 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-blue-300">Quality Answer Flow</p>
          <h1 className="text-3xl font-semibold">Quality Answer Flow Debug Panel</h1>
          <p className="text-sm text-slate-300">
            Enter a question and select a model. The API will run intent classification, strategy
            matching, domain constraints, and final answer generation.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40"
        >
          <section className="space-y-2">
            <label htmlFor="test-case" className="text-sm font-medium text-slate-200">
              Test case
            </label>
            <select
              id="test-case"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/60"
              value={selectedTestCaseId}
              onChange={event => handleTestCaseChange(event.target.value)}
            >
              {DEBUG_TEST_CASES.map(test => (
                <option key={test.id} value={test.id}>
                  {test.id} · {test.category} · {test.debugFocus}
                </option>
              ))}
              <option value={CUSTOM_TEST_CASE_ID}>Custom input</option>
            </select>
            <label htmlFor="question" className="text-sm font-medium text-slate-200">
              User question
            </label>
            <textarea
              id="question"
              className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/60"
              placeholder="Example: Design a go-to-market strategy for a new product..."
              value={question}
              onChange={event => handleQuestionInput(event.target.value)}
            />
          </section>

          <section className="space-y-4">
            <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-4 text-sm font-medium text-slate-200">
                <span>Select model</span>
                <span className="text-xs text-slate-400">
                  {selectedModel ? `Selected: ${getModelLabel(selectedModel)}` : "No model selected"}
                </span>
              </summary>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-200">Available models</p>
              </div>
              <div className="mt-3">
                <ModelSelector selectedModels={selectedModels} onToggle={handleModelToggle} />
              </div>
            </details>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/60"
            >
              {loading ? "Generating..." : "Generate answer"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </form>

        {result && (
          <ResultPanel
            classification={result.classification}
            strategy={result.strategy}
            strategyName={result.strategyName}
            finalPrompt={result.finalPrompt}
            answer={result.answer}
            directAnswer={result.directAnswer}
          />
        )}
      </div>
    </main>
  );
}

const ALL_MODEL_OPTIONS = MODEL_GROUPS.flatMap((group: any) => group.options);

function getModelLabel(value: string) {
  return ALL_MODEL_OPTIONS.find((option: any) => option.value === value)?.label ?? value;
}

type ResultPanelProps = QualityAnswerResponse;

const ResultPanel = ({
  classification,
  strategy,
  strategyName,
  finalPrompt,
  answer,
  directAnswer,
}: ResultPanelProps) => (
  <section className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-100">
    <div>
      <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <summary className="cursor-pointer select-none text-lg font-semibold text-white">
          Intent classification
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Category</dt>
          <dd className="text-base text-white">{classification.category}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Sub-category</dt>
          <dd className="text-base text-white">{classification.sub_category}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Domain</dt>
          <dd className="text-base text-white">{classification.domain}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Complexity</dt>
          <dd className="text-base text-white">{classification.complexity}</dd>
        </div>
        </dl>
        {classification.methodology && (
          <p className="mt-2 text-xs text-slate-400">Methodology: {classification.methodology}</p>
        )}
        {classification.analysis_reasoning && (
          <p className="mt-1 text-xs text-slate-500">
            {classification.analysis_reasoning}
          </p>
        )}
      </details>
    </div>

    <div>
      <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <summary className="cursor-pointer select-none text-lg font-semibold text-white">
          Strategy details
        </summary>
        {strategy ? (
          <div className="mt-2 space-y-2 rounded-lg border border-blue-500/20 bg-slate-950/30 p-4">
            {strategyName && (
              <p className="text-sm font-semibold text-white">{strategyName}</p>
            )}
            <p className="text-xs uppercase tracking-wide text-slate-400">Methodology</p>
            <p className="text-white">{strategy.methodology}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">Rules</p>
            <p className="whitespace-pre-wrap text-slate-100">{strategy.rules.trim()}</p>
          </div>
        ) : (
          <p className="mt-2 text-slate-400">No strategy matched. Using default constraints.</p>
        )}
      </details>
    </div>

    <div>
      <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <summary className="cursor-pointer select-none text-lg font-semibold text-white">
          Final prompt
        </summary>
        <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 p-4 text-xs text-slate-200">
          <Markdown content={finalPrompt} />
        </div>
      </details>
    </div>

    <div>
      <h2 className="text-lg font-semibold text-white">Answer comparison</h2>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-green-500/20 bg-slate-950/30 p-4 text-sm text-slate-100">
          <p className="mb-2 text-xs uppercase tracking-wide text-green-300">Guided</p>
          <Markdown content={answer} />
        </div>
        <div className="rounded-lg border border-yellow-500/20 bg-slate-950/30 p-4 text-sm text-slate-100">
          <p className="mb-2 text-xs uppercase tracking-wide text-yellow-300">Direct</p>
          <Markdown content={directAnswer} />
        </div>
      </div>
    </div>
  </section>
);
