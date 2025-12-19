/* eslint-disable @typescript-eslint/no-explicit-any */
// remarkUiDirectives.ts
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { toHast } from "mdast-util-to-hast";

type AnyNode = any;

function attrsToProps(attrs: Record<string, unknown> | undefined) {
  const out: Record<string, any> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) out[k] = v;
  return out;
}

/**
 * Turns markdown directives into “virtual HTML tags”:
 * :::card title="A" :::  -> <ui-card title="A">...</ui-card>
 * :::kpi ... :::         -> <ui-kpi ... />
 * :::steps :::           -> <ui-steps>...</ui-steps>
 * :::cards :::           -> <ui-cards>...</ui-cards>
 * :::chart :::           -> <ui-chart>...</ui-chart>
 * :::swot :::            -> <ui-swot>...</ui-swot>
 */
export const remarkUiDirectives: Plugin = () => {
  return (tree: AnyNode) => {
    visit(tree, ['containerDirective'], (node: AnyNode) => {
      const name = String(node.name || "");
      const supported = new Set(["card", "kpi", "steps", "cards", "chart", "swot"]);
      if (!supported.has(name)) return;

      const data = (node.data ??= {});
      data.hName = `ui-${name}`;
      data.hProperties = node.attributes ? node.attributes : {};
    });
  };
};
