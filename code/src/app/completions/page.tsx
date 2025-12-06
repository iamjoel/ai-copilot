'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const modelOptions = [
  { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
  { label: "Gemini 3", value: "gemini-3" },
  { label: "GPT-4o mini", value: "gpt-4o-mini" },
];

export default function CompletionsPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(modelOptions[0].value);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, model }),
      });

      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "请求失败");
      }

      setResponse(data.text ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-200">
            Completions Studio
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Prompt once, compare across Gemini & GPT.
          </h1>
          <p className="max-w-2xl text-sm text-slate-200">
            选择一个模型，输入文本，然后查看接口返回的补全结果。UI 使用
            ShadUI 组件，方便快速实验不同模型的效果。
          </p>
        </header>

        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardHeader>
            <CardTitle>发送补全请求</CardTitle>
            <CardDescription className="text-slate-200">
              自由切换模型，快速比较回复风格。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-slate-200">
                  模型
                </Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger
                    id="model"
                    className="border-white/10 bg-slate-950/60 text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-950/90 text-white backdrop-blur">
                    {modelOptions.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="cursor-pointer focus:bg-slate-800/60 focus:text-white"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-slate-200">
                  输入文本
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="描述你想让模型完成的内容..."
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  className="bg-slate-950/60 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-300">
                  当前模型：{modelOptions.find(m => m.value === model)?.label}
                </p>
                <Button type="submit" size="lg" disabled={loading || !prompt}>
                  {loading ? "发送中..." : "发送请求"}
                </Button>
              </div>
            </form>

            {error ? (
              <p className="rounded-lg border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label className="text-slate-200">接口返回</Label>
              <div className="min-h-[140px] rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 whitespace-pre-wrap">
                {loading ? (
                  <div className="animate-pulse space-y-2 text-slate-400">
                    <div className="h-3 w-3/5 rounded bg-white/10" />
                    <div className="h-3 w-2/5 rounded bg-white/10" />
                    <div className="h-3 w-4/5 rounded bg-white/10" />
                  </div>
                ) : response ? (
                  response
                ) : (
                  <span className="text-slate-500">
                    等待发送请求，或试试提示：&ldquo;给我一条周末出游建议&rdquo;。
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
