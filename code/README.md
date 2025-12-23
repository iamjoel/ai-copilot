# AI Copilot Playground

A Next.js 16 playground for comparing model completions, running prompt flows, and testing AI utilities with the Vercel AI SDK v5.

## Features
- Multi-model completion playground with side-by-side responses
- Quality Answer Flow debug panel
- Image generation demo (Gemini)
- Model capability test runner
- Usage/latency inspection and tool demos

## Requirements
- Node.js 18+ (recommended 20+)
- npm, pnpm, or yarn

## Getting Started
1) Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
2) Create your environment file:
   ```bash
   cp .env.example .env
   ```
3) Fill in the required API keys in `.env`.
4) Start the dev server:
   ```bash
   npm run dev
   ```
5) Open http://localhost:3000

## Useful Scripts
- `npm run dev` — Start the dev server
- `npm run build` — Build for production
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint
