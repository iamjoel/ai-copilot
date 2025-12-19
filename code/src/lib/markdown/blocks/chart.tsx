import React from "react";

type ChartSeries = {
  name: string;
  value: number;
  raw: string;
};

type ChartRow = {
  label: string;
  series: ChartSeries[];
};

function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) return nodeText(node.props.children);
  return "";
}

function isElement(node: React.ReactNode, tag: string) {
  return React.isValidElement(node) && node.type === tag;
}

function parseTable(tableNode: React.ReactElement) {
  const tableChildren = React.Children.toArray(tableNode.props.children);
  const thead = tableChildren.find((child) => isElement(child, "thead")) as
    | React.ReactElement
    | undefined;
  const tbody = tableChildren.find((child) => isElement(child, "tbody")) as
    | React.ReactElement
    | undefined;

  let headers: string[] = [];
  if (thead) {
    const headRows = React.Children.toArray(thead.props.children).filter((child) =>
      isElement(child, "tr"),
    ) as React.ReactElement[];
    const headCells =
      headRows.length > 0 ? React.Children.toArray(headRows[0].props.children) : [];
    headers = headCells
      .filter((cell) => isElement(cell, "th") || isElement(cell, "td"))
      .map((cell) => nodeText((cell as React.ReactElement).props.children));
  }

  const rows: ChartRow[] = [];
  if (tbody) {
    const bodyRows = React.Children.toArray(tbody.props.children).filter((child) =>
      isElement(child, "tr"),
    ) as React.ReactElement[];
    bodyRows.forEach((row) => {
      const cells = React.Children.toArray(row.props.children).filter((cell) =>
        isElement(cell, "td"),
      ) as React.ReactElement[];
      const values = cells.map((cell) => nodeText(cell.props.children));
      if (!values.length) return;
      const label = values[0] ?? "";
      const seriesNames = headers.length > 1 ? headers.slice(1) : values.slice(1).map((_, i) => `Series ${i + 1}`);
      const series = values.slice(1).map((raw, index) => {
        const numeric = Number.parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
        return {
          name: seriesNames[index] ?? `Series ${index + 1}`,
          value: Number.isFinite(numeric) ? numeric : 0,
          raw,
        };
      });
      rows.push({ label, series });
    });
  }

  const maxValue = rows.reduce((max, row) => {
    return Math.max(max, ...row.series.map((series) => series.value));
  }, 0);

  return { headers, rows, maxValue };
}

function UiChart({
  children,
  type = "bar",
  title,
}: {
  children?: React.ReactNode;
  type?: string;
  title?: string;
}) {
  const childArray = React.Children.toArray(children);
  const tableNode = childArray.find((child) => isElement(child, "table")) as
    | React.ReactElement
    | undefined;
  const nonTable = childArray.filter((child) => !isElement(child, "table"));

  if (!tableNode || type !== "bar") {
    return (
      <div className="rounded-2xl border p-4">
        {title ? <div className="text-base font-semibold">{title}</div> : null}
        {nonTable.length ? <div className="mt-2 prose prose-sm max-w-none">{nonTable}</div> : null}
        {tableNode ? <div className="mt-4 overflow-x-auto">{tableNode}</div> : null}
      </div>
    );
  }

  const { rows, maxValue } = parseTable(tableNode);
  const colors = ["#0284c7", "#22c55e", "#f97316", "#e11d48", "#8b5cf6"];

  return (
    <div className="rounded-2xl border p-4">
      {title ? <div className="text-base font-semibold">{title}</div> : null}
      {nonTable.length ? <div className="mt-2 prose prose-sm max-w-none">{nonTable}</div> : null}
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-3 md:grid-cols-[140px,1fr]">
            <div className="text-sm text-muted-foreground">{row.label}</div>
            <div className="space-y-2">
              {row.series.map((series, index) => {
                const width = maxValue > 0 ? Math.min(100, (series.value / maxValue) * 100) : 0;
                return (
                  <div key={`${row.label}-${series.name}`} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground">{series.name}</div>
                    <div className="relative h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                    </div>
                    <div className="text-xs tabular-nums">{series.raw}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">{tableNode}</div>
    </div>
  );
}

export default UiChart;
