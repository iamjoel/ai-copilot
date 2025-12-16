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
 */
export const remarkUiDirectives: Plugin = () => {
  return (tree: AnyNode) => {
    visit(tree, (node: AnyNode) => {
      if (
        node?.type !== "containerDirective" &&
        node?.type !== "leafDirective" &&
        node?.type !== "textDirective"
      ) {
        return;
      }

      const name = String(node.name || "");
      const supported = new Set(["card", "kpi", "steps"]);
      if (!supported.has(name)) return;

      const data = (node.data ??= {});
      data.hName = `ui-${name}`;
      data.hProperties = attrsToProps(node.attributes);
      if (node.type === "containerDirective") {
        data.hChildren = (node.children ?? [])
          .map(child => toHast(child))
          .filter(Boolean);
      }
    });
  };
};
