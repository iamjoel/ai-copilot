"use client";

import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ValueCurveEntry = {
  name: string;
  values: string[];
  userTag: string;
  userNote: string;
};

type ValueCurveData = {
  dimensions: string[];
  curves: ValueCurveEntry[];
};

type ValueCurveChartProps = {
  data: ValueCurveData;
};

const levelOrder: Record<string, number> = {
  O: 5,
  F: 4,
  S: 3,
  W: 2,
  X: 1,
};

const decodeLevel = (value: string) => {
  const letter = value?.trim().toUpperCase().charAt(0);
  return levelOrder[letter] ?? 3;
};

const palette = ["#f97316", "#22d3ee", "#a855f7", "#ec4899", "#22c55e"];

const wrapDimensionLabel = (label: string, maxChars = 12) => {
  if (!label) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  const pushCurrentLine = () => {
    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }
  };

  label.split(/\s+/).forEach((segment) => {
    if (!segment) {
      return;
    }

    if (segment.length > maxChars) {
      pushCurrentLine();
      for (let i = 0; i < segment.length; i += maxChars) {
        lines.push(segment.slice(i, i + maxChars));
      }
      return;
    }

    const combined = currentLine ? `${currentLine} ${segment}` : segment;
    if (combined.length <= maxChars) {
      currentLine = combined;
    } else {
      pushCurrentLine();
      currentLine = segment;
    }
  });

  pushCurrentLine();

  if (!lines.length) {
    return [label];
  }

  return lines;
};

const ValueCurveChart = ({ data }: ValueCurveChartProps) => {
  const { dimensions, curves } = data;
  if (!dimensions.length || !curves.length) {
    return null;
  }

  const chartWidth = 560;
  const chartHeight = 260;
  const padding = 32;
  const bottomPadding = 40;
  const viewBoxHeight = chartHeight + bottomPadding;
  const xStep = dimensions.length > 1 ? (chartWidth - padding * 2) / (dimensions.length - 1) : 0;
  const yRange = chartHeight - padding * 2;
  const axisTicks = ["O", "F", "S", "W", "X"];

  const buildPath = (values: string[]) => {
    const points = dimensions.map((_, idx) => {
      const value = values[idx] ?? "S";
      const score = decodeLevel(value);
      const x = padding + (xStep * idx);
      const y = chartHeight - padding - ((score - 1) / 4) * yRange;
      return [x, y];
    });
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`)
      .join(" ");
  };

  return (
    <div className="grid w-full gap-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5 lg:grid-cols-[1.4fr_0.6fr]">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <p className="font-semibold text-base text-white">Strategic Mapping Canvas</p>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900/40">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${viewBoxHeight}`}
            role="img"
            aria-label="Value curve chart"
          >
            <defs>
              <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
            </defs>
            {axisTicks.map((tick, index) => {
              const y = padding + (yRange / (axisTicks.length - 1)) * index;
              return (
                <g key={tick}>
                  <line
                    x1={padding}
                    x2={chartWidth - padding}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <text x={padding - 10} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12">
                    {tick}
                  </text>
                </g>
              );
            })}
            {dimensions.map((dimension, idx) => {
              const x = padding + (xStep * idx);
              const labelLines = wrapDimensionLabel(dimension, 16);
              return (
                <g key={dimension}>
                  <line
                    x1={x}
                    x2={x}
                    y1={padding}
                    y2={chartHeight - padding}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={x}
                    y={chartHeight + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.65)"
                    fontSize="11"
                    fontWeight={600}
                    dominantBaseline="hanging"
                  >
                    {labelLines.map((line, lineIndex) => (
                      <tspan key={`${dimension}-${lineIndex}`} x={x} dy={lineIndex === 0 ? 0 : 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            {curves.map((curve, index) => (
              <g key={curve.name}>
                <path
                  d={buildPath(curve.values)}
                  fill="none"
                  stroke={palette[index % palette.length]}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {dimensions.map((_, valueIdx) => {
                  const value = curve.values[valueIdx] ?? "S";
                  const score = decodeLevel(value);
                  const x = padding + xStep * valueIdx;
                  const y = chartHeight - padding - ((score - 1) / 4) * yRange;
                  return (
                    <circle
                      key={`${curve.name}-${value}-${valueIdx}`}
                      cx={x}
                      cy={y}
                      r={4.5}
                      fill={palette[index % palette.length]}
                      stroke="white"
                      strokeWidth={1.4}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        <p className="font-semibold text-base text-white">Customer Tags</p>
        <div className="space-y-3">
          {curves.map((curve, index) => (
            <div key={curve.name} className="rounded-2xl border border-white/5 bg-slate-950/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="h-2.5 w-6 rounded-full"
                  style={{ backgroundColor: palette[index % palette.length] }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{curve.name}</p>
                  <p className="text-xs text-slate-400">{curve.userTag}</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white transition hover:border-white/40"
                        aria-label={`${curve.name} 用户描述`}
                      >
                        <InfoIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-[13px]">
                      <p className="text-slate-50">{curve.userNote}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export type { ValueCurveData, ValueCurveEntry };
export default ValueCurveChart;
