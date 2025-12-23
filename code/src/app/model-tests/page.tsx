'use client';

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getModelPreset } from "@/lib/model-presets";
import rawTestCases from "@/data/model-capability-tests.json";

type ModelCapabilityTest = {
  name: string;
  input: string;
  models: string[];
  outputs: Record<string, string>;
  expect: string;
};

const testCases = rawTestCases as ModelCapabilityTest[];

type OutputState = Record<string, Record<string, string>>;
type RowState = Record<string, boolean>;
type ErrorState = Record<string, string | null>;

export default function ModelCapabilityTestsPage() {
  const [outputs, setOutputs] = useState<OutputState>(() => {
    return testCases.reduce<OutputState>((acc, test) => {
      acc[test.name] = { ...test.outputs };
      return acc;
    }, {});
  });
  const [running, setRunning] = useState<RowState>({});
  const [errors, setErrors] = useState<ErrorState>({});

  const caseCount = testCases.length;

  const runTestMutation = useMutation({
    mutationFn: async ({ prompt, modelKey }: { prompt: string; modelKey: string }) => {
      const response = await fetch("/api/model-tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelKey }),
      });
      const data = (await response.json()) as { output?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "运行失败");
      }
      return data;
    },
  });

  const handleRun = async (test: ModelCapabilityTest, modelKey: string) => {
    const rowKey = `${test.name}:${modelKey}`;
    setRunning(prev => ({ ...prev, [rowKey]: true }));
    setErrors(prev => ({ ...prev, [rowKey]: null }));
    try {
      const data = await runTestMutation.mutateAsync({ prompt: test.input, modelKey });
      setOutputs(prev => ({
        ...prev,
        [test.name]: {
          ...(prev[test.name] ?? {}),
          [modelKey]: data.output ?? "",
        },
      }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [rowKey]: error instanceof Error ? error.message : "运行失败",
      }));
    } finally {
      setRunning(prev => ({ ...prev, [rowKey]: false }));
    }
  };

  const renderModelLabel = (key: string) => {
    const preset = getModelPreset(key);
    return preset?.label ?? key;
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-gray-100">
      <section className="mb-8 space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Model Stress Tests</p>
        <h1 className="text-4xl font-semibold text-white">模型能力边界探索集</h1>
        <p className="max-w-3xl text-sm text-gray-300">
          这些测试覆盖长文本规划、事实核对以及 SQL 合成等复杂任务。每个测试会列出目标期望、历史输出以及可运行模型，
          方便快速比较不同模型的表现。数据定义存放在 <code className="rounded bg-white/10 px-2 py-1 text-xs">src/data/model-capability-tests.json</code> 中，按需修改即可扩展。
        </p>
        <div className="text-sm text-gray-400">当前共有 {caseCount} 个测试。</div>
      </section>

      <div className="space-y-8">
        {testCases.map(test => (
          <article
            key={test.name}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-md shadow-black/40"
          >
            <header className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-200">Test Case</div>
              <h2 className="text-2xl font-semibold text-white">{test.name}</h2>
              <p className="text-sm text-amber-200">期望：{test.expect}</p>
            </header>

            <section className="grid gap-4 rounded-xl border border-white/5 bg-black/30 p-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-gray-400">Prompt</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-100">{test.input}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-gray-400">可用模型</div>
                <p className="mt-2 text-sm text-gray-100">{test.models.map(renderModelLabel).join(" / ")}</p>
              </div>
            </section>

            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="text-xs uppercase tracking-[0.28em] text-gray-400">模型输出</div>
              <div className="divide-y divide-white/5">
                {test.models.map(modelKey => {
                  const rowKey = `${test.name}:${modelKey}`;
                  const text = outputs[test.name]?.[modelKey] ?? "";
                  const isRunning = running[rowKey];
                  const error = errors[rowKey];
                  return (
                    <div
                      key={modelKey}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-5"
                    >
                      <div className="w-full max-w-[220px] text-sm">
                        <div className="font-semibold text-white">{renderModelLabel(modelKey)}</div>
                        <div className="text-xs text-gray-400">{modelKey}</div>
                      </div>
                      <div className="flex-1 rounded border border-white/5 bg-black/30 p-3 text-sm text-gray-100">
                        {text ? (
                          <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{text}</p>
                        ) : (
                          <span className="text-gray-500">暂无输出</span>
                        )}
                      </div>
                      <div className="flex w-full justify-end sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleRun(test, modelKey)}
                          disabled={isRunning}
                          className="inline-flex items-center rounded-lg border border-emerald-200/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:text-emerald-50 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-gray-500"
                        >
                          {isRunning ? "运行中..." : "运行"}
                        </button>
                      </div>
                      {error && <p className="text-xs text-red-300 sm:col-span-3">{error}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
