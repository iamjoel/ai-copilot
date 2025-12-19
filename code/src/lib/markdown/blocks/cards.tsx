import React from "react";
import UiCard from "./card";

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

function UiCards({ children }: { children?: React.ReactNode }) {
  const chunks = splitByHr(children);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {chunks.map((chunk, index) => {
        if (!chunk.length) return null;
        const first = chunk[0];
        if (isHeading(first)) {
          const title = nodeText(first.props.children);
          const body = chunk.slice(1);
          return (
            <UiCard key={`card-${index}`} title={title}>
              {body.length ? <>{body}</> : null}
            </UiCard>
          );
        }
        return (
          <UiCard key={`card-${index}`}>
            <>{chunk}</>
          </UiCard>
        );
      })}
    </div>
  );
}

export default UiCards;
