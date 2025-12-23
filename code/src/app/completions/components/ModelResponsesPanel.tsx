import { Markdown } from "@/lib/markdown/react-markdown";
import { type ModelResponse } from "../useCompletions";
import { useModel } from "@/hooks/use-model";

type ModelResponsesPanelProps = {
  responses: Record<string, ModelResponse>;
};

const ModelResponsesPanel = ({ responses }: ModelResponsesPanelProps) => {
  const { getModelLabel } = useModel();
  if (Object.keys(responses).length === 0) {
    return (
      <div className="min-h-[140px] rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100">
        <span className="text-slate-500">
          等待发送请求，或试试提示：&ldquo;给我一条周末出游建议&rdquo;。
        </span>
      </div>
    );
  }

  const responseEntries = Object.entries(responses);
  const columnClassName =
    responseEntries.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : responseEntries.length === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className={`grid gap-4 ${columnClassName}`}>
      {responseEntries.map(([modelValue, result]) => (
        <div
          key={modelValue}
          className="min-w-0 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <p className="font-medium text-slate-100">{getModelLabel(modelValue)}</p>
            <span
              className={`text-xs ${result.status === "loading"
                ? "text-blue-200"
                : result.status === "error"
                  ? "text-red-200"
                  : "text-emerald-200"
                }`}
            >
              {result.status === "loading"
                ? "执行中..."
                : result.status === "error"
                  ? "请求失败"
                  : "完成"}
            </span>
          </div>
          <div className="min-w-0 pt-2">
            {result.status === "loading" ? (
              result.text ? (
                <Markdown content={result.text} isAnimating />
              ) : (
                <div className="animate-pulse space-y-2 text-slate-400">
                  <div className="h-3 w-3/5 rounded bg-white/10" />
                  <div className="h-3 w-2/5 rounded bg-white/10" />
                  <div className="h-3 w-4/5 rounded bg-white/10" />
                </div>
              )
            ) : result.status === "error" ? (
              <p className="text-sm text-red-200">{result.error}</p>
            ) : (
              <Markdown content={result.text ?? ""} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModelResponsesPanel;
