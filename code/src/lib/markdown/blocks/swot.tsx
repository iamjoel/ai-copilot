import React from "react";

type SwotItem = {
  title: string;
  body: React.ReactNode[];
};

const DEFAULT_TITLES = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
const CARD_STYLES = [
  {
    container: "border-emerald-400/30 bg-emerald-500/15",
    title: "text-emerald-200",
  },
  {
    container: "border-rose-400/30 bg-rose-500/15",
    title: "text-rose-200",
  },
  {
    container: "border-sky-400/30 bg-sky-500/15",
    title: "text-sky-200",
  },
  {
    container: "border-amber-400/30 bg-amber-500/15",
    title: "text-amber-200",
  },
];

function isHeading(node: React.ReactNode) {
  return (
    React.isValidElement(node) &&
    typeof node.type === "string" &&
    ["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.type)
  );
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) return nodeText(node.props.children);
  return "";
}

function splitByHr(children: React.ReactNode) {
  const parts: React.ReactNode[][] = [];
  let current: React.ReactNode[] = [];
  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child) && child.type === "hr") {
      if (current.length) parts.push(current);
      current = [];
      return;
    }
    current.push(child);
  });
  if (current.length) parts.push(current);
  return parts;
}

function toSwotItems(children: React.ReactNode) {
  const chunks = splitByHr(children);
  return chunks.map((chunk, index) => {
    if (!chunk.length) {
      return { title: DEFAULT_TITLES[index] ?? `Section ${index + 1}`, body: [] };
    }
    const first = chunk[0];
    if (isHeading(first)) {
      return {
        title: nodeText(first.props.children) || DEFAULT_TITLES[index] || `Section ${index + 1}`,
        body: chunk.slice(1),
      };
    }
    return {
      title: DEFAULT_TITLES[index] ?? `Section ${index + 1}`,
      body: chunk,
    };
  });
}

function toListItems(value?: string) {
  if (!value) return [];
  return value
    .split(/\r?\n|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function UiSwot({
  children,
  strengths,
  weaknesses,
  opportunities,
  threats,
}: {
  children?: React.ReactNode;
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
}) {
  const propItems = [
    { title: "Strengths", body: toListItems(strengths) },
    { title: "Weaknesses", body: toListItems(weaknesses) },
    { title: "Opportunities", body: toListItems(opportunities) },
    { title: "Threats", body: toListItems(threats) },
  ];
  const hasPropContent = propItems.some((item) => item.body.length > 0);
  const items: SwotItem[] = hasPropContent
    ? propItems.map((item) => ({
      title: item.title,
      body: item.body.map((entry, index) => <li key={`${item.title}-${index}`}>{entry}</li>),
    }))
    : toSwotItems(children);
  return (
    <div className="my-2 grid gap-4 md:grid-cols-2">
      {items.map((item, index) => {
        const style = CARD_STYLES[index % CARD_STYLES.length];
        return (
          <div
            key={`swot-${index}`}
            className={`rounded-2xl border p-4 ${style.container}`}
          >
            <div className={`text-sm font-semibold ${style.title}`}>{item.title}</div>
            {item.body.length ? (
              <div className="mt-2 prose prose-sm max-w-none text-slate-100">
                {hasPropContent ? <ul>{item.body}</ul> : item.body}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default UiSwot;
