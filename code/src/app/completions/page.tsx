'use client';

import CompletionsHeader from "./components/CompletionsHeader";
import CompletionsRequestCard from "./components/CompletionsRequestCard";
import { useCompletions } from "./useCompletions";

export default function CompletionsPage() {
  const controller = useCompletions();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex max-w-[90vw] flex-col gap-8 px-6 py-12">
        <CompletionsHeader />
        <CompletionsRequestCard controller={controller} />
      </div>
    </main>
  );
}
