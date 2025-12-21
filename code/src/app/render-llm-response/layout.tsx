import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LLM 渲染示例",
};

export default function RenderLlmResponseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
