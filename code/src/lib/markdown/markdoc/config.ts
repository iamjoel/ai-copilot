import Markdoc, { Config } from "@markdoc/markdoc";

// 1) tags：定义你支持的“扩展块”
export const markdocConfig: Config = {
  tags: {
    card: {
      attributes: {
        title: { type: String },
        subtitle: { type: String },
        icon: { type: String },
      },
      render: "UiCard",
    },

    kpi: {
      attributes: {
        label: { type: String },
        value: { type: String },
        delta: { type: String },
        trend: { type: String, matches: ["up", "down", "flat"] },
      },
      render: "UiKpi",
      selfClosing: true,
    },

    steps: {
      attributes: {
        title: { type: String, default: "步骤" },
      },
      render: "UiSteps",
    },
  },
};
