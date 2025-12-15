'use client';

import { useState } from "react";

type DirectoryEntry = {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
};

type ListDirectoryResponse = {
  path: string;
  entries: DirectoryEntry[];
};



export default function ListFilesPage() {
  const [pathInput, setPathInput] = useState("src");
  const [result, setResult] = useState<ListDirectoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/tools/list-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathInput }),
      });
      const data = (await response.json()) as
        | ListDirectoryResponse
        | { error?: string };
      if (!response.ok || "error" in data) {
        setError((data as { error?: string }).error ?? "请求失败。");
        return;
      }
      setResult(data);
    } catch (err) {
      setError("网络错误，请稍后再试。");
      console.error("List directory request failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-gray-100">
      <section className="mb-8 space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">AI Tooling</p>
        <h1 className="text-4xl font-semibold text-white">List Directory Tool</h1>
        <p className="max-w-3xl text-sm text-gray-300">
          这是一个提供给 Vercel AI LLM 使用的工具，能够读取工程中的指定目录，并以 `ls` 的方式返回下级文件和文件夹。
          你既可以通过 LLM 的 tools API 使用它，也可以在下方页面直接体验同样的接口。
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/30">
        <h2 className="text-lg font-semibold text-white">在线试用</h2>
        <p className="mt-1 text-sm text-gray-300">
          输入一个相对于项目根目录的路径（默认 <code className="rounded bg-white/10 px-1 py-0.5 text-xs">.</code>），
          然后点击「列出文件」查看结果。
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={pathInput}
            onChange={event => setPathInput(event.target.value)}
            placeholder="例如：src/app"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-white/40 focus:outline-none disabled:opacity-60"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "查询中..." : "列出文件"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        {result && (
          <div className="mt-5 rounded-xl border border-white/10 bg-black/30">
            <div className="border-b border-white/5 px-4 py-3 text-xs uppercase tracking-[0.28em] text-gray-400">
              {result.path === "." ? "Workspace Root" : result.path}
            </div>
            <ul className="divide-y divide-white/5">
              {result.entries.map(entry => (
                <li key={entry.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-white">{entry.name}</div>
                    <div className="text-xs text-gray-500">{entry.path}</div>
                  </div>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
                    {entry.kind}
                  </span>
                </li>
              ))}
              {result.entries.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-400">该目录为空。</li>
              )}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
