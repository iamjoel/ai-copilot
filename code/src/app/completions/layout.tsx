import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Completions",
};

export default function CompletionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
