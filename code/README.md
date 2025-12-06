Next.js 16 starter configured with Tailwind and the Vercel AI SDK (v5).

## Getting started
1) Copy `.env.local.example` to `.env.local` and set `OPENAI_API_KEY`.
2) Install dependencies (already done): `npm install`.
3) Run the dev server: `npm run dev` then open http://localhost:3000.

## What’s included
- `/api/chat` uses `streamText` with OpenAI (`gpt-4o-mini`) on the Edge runtime.
- Frontend chat UI in `src/app/page.tsx` powered by `useChat` from `ai/react`.
- Tailwind CSS (v4) with the App Router, TypeScript, ESLint, and React Compiler enabled.
