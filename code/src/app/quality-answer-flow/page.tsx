/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useMemo, useState } from "react";
import ModelSelector from "@/app/completions/components/ModelSelector";
import { MODEL_GROUPS } from "@/lib/model-presets";
import { Markdown } from "@/lib/markdown/streamdown";
import { DEBUG_TEST_CASES } from "./test-case";

const DEFAULT_MODEL = MODEL_GROUPS[0]?.options[0]?.value ?? "";
const CUSTOM_TEST_CASE_ID = "__custom_prompt__";

type QualityAnswerResponse = {
  classification: {
    category: string;
    complexity: number;
    methodology?: string;
    analysis_reasoning?: string;
  };
  strategy: {
    constraints: string;
    recommendedTone: string;
  } | null;
  strategyName: string | null;
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
    defaultTestCase?.userQuery ?? "请输入需要分析的问题...",
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
      setError("请先输入问题");
      return;
    }
    if (!selectedModel) {
      setError("请选择一个模型");
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
        throw new Error(data.error ?? "请求失败");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 py-12 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-blue-300">Quality Answer Flow</p>
          <h1 className="text-3xl font-semibold">高质量回答流程调试面板</h1>
          <p className="text-sm text-slate-300">
            输入问题并选择模型，API 将自动完成意图分类、策略匹配与最终回答生成。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40"
        >
          <section className="space-y-2">
            <label htmlFor="test-case" className="text-sm font-medium text-slate-200">
              测试用例
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
              <option value={CUSTOM_TEST_CASE_ID}>自定义输入</option>
            </select>
            <label htmlFor="question" className="text-sm font-medium text-slate-200">
              用户问题
            </label>
            <textarea
              id="question"
              className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/60"
              placeholder="例如：帮我设计一个新产品的上市策略..."
              value={question}
              onChange={event => handleQuestionInput(event.target.value)}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-200">选择模型</p>
              {selectedModel && (
                <p className="text-xs text-slate-400">当前模型：{getModelLabel(selectedModel)}</p>
              )}
            </div>
            <ModelSelector selectedModels={selectedModels} onToggle={handleModelToggle} />
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/60"
            >
              {loading ? "生成中..." : "生成答案"}
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
      <h2 className="text-lg font-semibold text-white">意图识别</h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Category</dt>
          <dd className="text-base text-white">{classification.category}</dd>
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
    </div>

    <div>
      <h2 className="text-lg font-semibold text-white">策略详情</h2>
      {strategy ? (
        <div className="mt-2 space-y-2 rounded-lg border border-blue-500/20 bg-slate-950/30 p-4">
          {strategyName && (
            <p className="text-sm font-semibold text-white">{strategyName}</p>
          )}
          <p className="text-xs uppercase tracking-wide text-slate-400">Recommended Tone</p>
          <p className="text-white">{strategy.recommendedTone}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">Constraints</p>
          <p className="whitespace-pre-wrap text-slate-100">{strategy.constraints.trim()}</p>
        </div>
      ) : (
        <p className="mt-2 text-slate-400">未匹配到策略，使用默认回答约束。</p>
      )}
    </div>

    <div>
      <h2 className="text-lg font-semibold text-white">最终 Prompt</h2>
      <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 p-4 text-xs text-slate-200">
        <Markdown content={finalPrompt} />
      </div>
    </div>

    <div>
      <h2 className="text-lg font-semibold text-white">模型回答对比</h2>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-green-500/20 bg-slate-950/30 p-4 text-sm text-slate-100">
          <p className="mb-2 text-xs uppercase tracking-wide text-green-300">策略引导</p>
          <Markdown content={answer} />
        </div>
        <div className="rounded-lg border border-yellow-500/20 bg-slate-950/30 p-4 text-sm text-slate-100">
          <p className="mb-2 text-xs uppercase tracking-wide text-yellow-300">直接回答</p>
          <Markdown content={directAnswer} />
        </div>
      </div>
    </div>
  </section>
);
