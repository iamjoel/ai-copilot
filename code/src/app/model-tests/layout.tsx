import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "模型能力测试",
};

export default function ModelTestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
