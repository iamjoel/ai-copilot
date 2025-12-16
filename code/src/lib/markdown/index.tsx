/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// RenderMarkdown.tsx
"use client";

import React from "react";
import { Streamdown } from "streamdown";
import remarkDirective from "remark-directive";
import { remarkUiDirectives } from "./remark-UiDirectives";
import UiCard from "./blocks/card";
import UiKpi from "./blocks/kpi";
import UiSteps from "./blocks/steps";

export function Markdown({ content, isAnimating }: { content: string; isAnimating?: boolean }) {
  return (
    <Streamdown
      isAnimating={!!isAnimating}
      remarkPlugins={[remarkDirective, remarkUiDirectives]}
      components={{
        "ui-card": ({ node, ...props }: any) => <UiCard {...(props as any)} />,
        "ui-kpi": ({ node, ...props }: any) => <UiKpi {...(props as any)} />,
        "ui-steps": ({ node, ...props }: any) => <UiSteps {...(props as any)} />,
      } as any}
    >
      {content}
    </Streamdown>
  );
}
