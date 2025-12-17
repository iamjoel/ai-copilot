/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// RenderMarkdown.tsx
"use client";

import React from "react";
import { Streamdown } from "streamdown";
import remarkDirective from "remark-directive";
import { remarkUiDirectives } from "./remark-UiDirectives";
import UiCard from "../blocks/card";
import UiKpi from "../blocks/kpi";
import UiSteps from "../blocks/steps";

export function Markdown({ content, isAnimating }: { content: string; isAnimating?: boolean }) {
  return (
    <Streamdown
      isAnimating={!!isAnimating}
      remarkPlugins={[remarkDirective, remarkUiDirectives]}
      components={{
        "ui-card": ({ children, ...rest }: any) => <UiCard {...(rest as any)}>{children}</UiCard>,
        "ui-kpi": (props: any) => <UiKpi {...(props as any)} />,
        "ui-steps": ({ children, ...rest }: any) => <UiSteps {...(rest as any)}>{children}</UiSteps>,
      } as any}
    >
      {content}
    </Streamdown>
  );
}
