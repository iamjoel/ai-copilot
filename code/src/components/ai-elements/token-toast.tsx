"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  urlTokens?: number;
  totalTokens?: number;
};

type TokenUsageToastProps = {
  usage?: TokenUsage;
  children?: ReactNode;
};

const formatValue = (value?: number) =>
  value === undefined ? "N/A" : new Intl.NumberFormat("en-US").format(value);

export const TokenUsageToast = ({ usage, children }: TokenUsageToastProps) => {
  if (!usage) {
    return null;
  }

  const rows = [
    { label: "Input tokens", value: usage.inputTokens },
    { label: "Output tokens", value: usage.outputTokens },
    { label: "URL tokens", value: usage.urlTokens },
    { label: "Total tokens", value: usage.totalTokens },
  ].filter(row => row.value !== undefined);

  if (rows.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1">
            <span>Tokens: {formatValue(usage.totalTokens)}</span>
            {children ?? (
              <InfoIcon className="size-3" />
            )}
            <span className="sr-only">Show token breakdown</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="min-w-40 space-y-1.5 text-xs">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between text-left">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-white">{formatValue(row.value)}</span>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
