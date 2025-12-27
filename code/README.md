# AI Copilot
## Project Overview
1. Push the boundaries of LLM capabilities.
2. Automate high-frequency daily workflows.
3. Deliver practical, LLM-driven solutions to users.

## LLM capabilities
### /prompt-engineer
Text generation. 

- Support different models.
- Support use tools.
- Todo: render customer components.

### /chat
Chat.

### /generate-image 
Image generation.

## Scenario
### /scenario/quality-answer-flow
Input question. Generate high-quality answer with world class strategy.

### /scenario/business-strategic-analysis
Input customer Objective. Generate Customer Profile and Value Curve Chart.

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

## Resources
- [AI SDK](https://ai-sdk.dev/docs/introduction)
- [Workflow SDK](https://useworkflow.dev/docs/getting-started)
- [Shadcn UI components](https://ui.shadcn.com/docs/components/alert)

## Code Copilot
* [Agents.md](https://developers.openai.com/codex/guides/agents-md/) `codex --ask-for-approval never "Summarize the current instructions."`
