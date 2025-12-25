"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const aspectOptions = [
  { value: "1:1", label: "Square 1:1" },
  { value: "3:4", label: "Portrait 3:4" },
  { value: "4:3", label: "Landscape 4:3" },
  { value: "9:16", label: "Tall 9:16" },
  { value: "16:9", label: "Wide 16:9" },
] as const;

const samplePrompts = [
  "A banana still life on a teal plate, studio lighting, soft shadows.",
  "Neon banana floating in a dusk sky, cinematic haze, high contrast.",
  "Minimal banana line art poster, off-white paper, bold black ink.",
  "Banana peel spaceship landing on a coral desert, retro sci-fi.",
] as const;

type Status = "idle" | "loading" | "error";

export default function GenImagePage() {
  const [prompt, setPrompt] = useState(samplePrompts[0]);
  const [aspectRatio, setAspectRatio] = useState<(typeof aspectOptions)[number]["value"]>("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const genImageMutation = useMutation({
    mutationFn: async ({
      prompt: promptText,
      aspectRatio: ratio,
    }: {
      prompt: string;
      aspectRatio: (typeof aspectOptions)[number]["value"];
    }) => {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, aspectRatio: ratio }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Image generation failed.");
      }

      const payload = (await response.json()) as { image: string };
      return payload;
    },
    onSuccess: payload => {
      setImageUrl(payload.image);
    },
    onError: requestError => {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Image generation failed.",
      );
    },
  });

  const status: Status = genImageMutation.isPending
    ? "loading"
    : genImageMutation.isError
      ? "error"
      : "idle";

  const isBusy = genImageMutation.isPending;
  const isLoading = status === "loading";

  const generatedLabel = useMemo(() => {
    if (status === "loading") {
      return "Generating...";
    }
    return "Generate";
  }, [status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() || isBusy) {
      return;
    }

    setError(null);
    genImageMutation.mutate({ prompt, aspectRatio });
  };

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#f8f1dd] text-slate-900 ${body.className}`}>
      <div className="pointer-events-none absolute -left-28 top-[-120px] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,#fde68a,#f59e0b)] opacity-70 blur-3xl float-slow" />
      <div className="pointer-events-none absolute right-[-160px] top-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,#c7f9cc,#d9f99d)] opacity-70 blur-3xl float-medium" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_bottom,#facc15,#fde047)] opacity-60 blur-3xl float-fast" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-end rise-in">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-600">Gemini Banana Image Lab</p>
            <h1 className={`text-4xl font-semibold leading-tight md:text-5xl ${display.className}`}>
              Summon bold banana visions with Gemini.
            </h1>
            <p className="max-w-xl text-base text-slate-700">
              Draft a prompt, pick a frame, and generate a fresh image in seconds. This page
              calls Gemini image generation to turn your idea into a vivid visual.
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Live Prompt Seeds
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {samplePrompts.map(sample => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="rounded-full border border-amber-200/80 bg-white px-4 py-2 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_10px_25px_-18px_rgba(15,23,42,0.6)]"
                >
                  {sample.split(",")[0]}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] rise-in rise-delay-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur"
          >
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  rows={5}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-inner outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="Describe the banana scene you want."
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Aspect
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {aspectOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAspectRatio(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${aspectRatio === option.value
                        ? "border-amber-400 bg-amber-50 text-slate-900 shadow-[0_10px_30px_-18px_rgba(245,158,11,0.6)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"
                        }`}
                    >
                      <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">
                        Frame
                      </span>
                      <span className="mt-1 block font-semibold">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="submit"
                  disabled={isLoading} // Not worked currently
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatedLabel}
                </Button>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>
          </form>

          <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur rise-in rise-delay-3">
            {imageUrl ? (
              <div className="relative w-full">
                <div className="absolute -left-6 top-6 h-20 w-20 rounded-full border border-amber-200 bg-white/80 shadow-[0_12px_35px_-25px_rgba(15,23,42,0.8)]" />
                <img
                  src={imageUrl}
                  alt="Generated banana"
                  className="w-full rounded-2xl object-cover shadow-[0_30px_80px_-50px_rgba(15,23,42,0.7)]"
                />
              </div>
            ) : (
              <div className="text-center text-sm text-slate-500">
                <div className="mx-auto mb-4 h-20 w-20 rounded-3xl border border-dashed border-amber-200 bg-amber-50" />
                <p>Start with a prompt to see the banana image appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <style jsx>{`
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-18px);
          }
        }

        .rise-in {
          animation: rise 0.7s ease-out both;
        }

        .rise-delay-2 {
          animation-delay: 0.15s;
        }

        .rise-delay-3 {
          animation-delay: 0.3s;
        }

        .float-slow {
          animation: float 9s ease-in-out infinite;
        }

        .float-medium {
          animation: float 7s ease-in-out infinite;
        }

        .float-fast {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
