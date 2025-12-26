import { Markdown } from "@/lib/markdown/react-markdown";
import { TokenUsageToast } from "@/components/ai-elements/token-toast";
import { type ModelResponse } from "../useCompletions";
import { useModel } from "@/hooks/use-model";

type ModelResponsesPanelProps = {
  responses: Record<string, ModelResponse>;
};

const ModelResponsesPanel = ({ responses }: ModelResponsesPanelProps) => {
  const { getModelLabel } = useModel();
  const formatTokens = (value?: number) =>
    value === undefined
      ? "N/A"
      : new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
  const formatSeconds = (value?: number) => (value === undefined ? "--s" : `${value}s`);
  const getTimeClassName = (value?: number) => {
    if (value === undefined) return "text-slate-400";
    if (value < 2) return "text-emerald-300";
    if (value < 10) return "text-amber-300";
    return "text-red-300";
  };
  if (Object.keys(responses).length === 0) {
    return (
      <div className="min-h-[140px] rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100">
        <span className="text-slate-500">
          Waiting to send a request, or try a prompt like: “Give me a weekend trip idea.”
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
          <div className="flex items-start justify-between border-b border-white/5 pb-2">
            <p className="font-medium text-slate-100">{getModelLabel(modelValue)}</p>
            <div className="flex items-center text-[11px] leading-snug space-x-1">
              {result.status !== "loading" && (
                <>
                  <div className="flex items-center gap-1 text-slate-400">
                    <TokenUsageToast usage={result.usage} />
                  </div>
                  <div className={`font-semibold ${getTimeClassName(result.responseTimeSec)}`}>
                    {formatSeconds(result.responseTimeSec)}
                  </div>
                </>
              )}

              <span
                className={`text-xs ${result.status === "loading"
                  ? "text-blue-200"
                  : result.status === "error"
                    ? "text-red-200"
                    : "text-emerald-200"
                  }`}
              >
                {result.status === "loading"
                  ? "Processing..."
                  : result.status === "error"
                    ? "Request Failed"
                    : ""}
              </span>
            </div>
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
