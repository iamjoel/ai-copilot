import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "目录工具",
};

export default function UseToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
