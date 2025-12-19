/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import remarkDirective from "remark-directive";
import { remarkUiDirectives } from "./remark-UiDirectives";
import ReactMarkdown from 'react-markdown'
import UiCard from "./blocks/card";
import UiKpi from "./blocks/kpi";
import UiSteps from "./blocks/steps";

export function Markdown({ content, isAnimating }: { content: string; isAnimating?: boolean }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkDirective, remarkUiDirectives]}
        components={{
          "ui-card": ({ children, ...rest }: any) => <UiCard {...(rest as any)}>{children}</UiCard>,
          "ui-kpi": (props: any) => <UiKpi {...(props as any)} />,
          "ui-steps": ({ children, ...rest }: any) => <UiSteps {...(rest as any)}>{children}</UiSteps>,
        } as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
