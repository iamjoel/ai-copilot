# AI Copilot

## Table of Contents
- [LLM capabilities](#llm-capabilities)
  - [Prompt Engineer](#prompt-engineer)
  - [Chat(Alpha)](#chatalpha)
  - [Generate image(Alpha)](#generate-imagealpha)
- [Daily](#daily)
  - [Efficient Coding](#efficient-coding)
- [Solution](#solution)
  - [/scenario/quality-answer-flow](#scenarioquality-answer-flow)
  - [/scenario/business-strategic-analysis](#scenariobusiness-strategic-analysis)
  - [/scenario/figma-mcp](#scenariofigma-mcp)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Useful Scripts](#useful-scripts)
- [Resources](#resources)
- [Code Copilot](#code-copilot)
- [Suggest Skills](#suggest-skills)
- [Suggest Codex Config](#suggest-codex-config)

## LLM capabilities
### Prompt Engineer
Select the most suitable LLM to accomplish the task.Then debug the prompt to improve the output quality.

path: `/prompt-engineer`

Features:
- Support different models.
- Support use tools.

Todo:
- [High]Render customer components.
- [High]Prompt engineer skills.
- [Medium]Support upload files as context.
- [Medium]Support RAG. Use file embeddings as context.

### Chat(Alpha)
path: `/chat`

Todo:
- [Low]Support render thought of chain.

### Generate image(Alpha)
path: `/generate-image`

## Daily
### Efficient Coding
1. Tools: Coding Agents with good configurations.
2. SOP


## Solution
### /scenario/quality-answer-flow
Input question. Generate high-quality answer with world class strategy.

### /scenario/business-strategic-analysis
Input customer Objective. Generate Customer Profile and Value Curve Chart.

### /scenario/figma-mcp
Generate UI from Figma design file link.

## Requirements
- Node.js 18+ (recommended 20+)
- pnpm

## Getting Started
1) Install dependencies:
   ```bash
   pnpm install
   ```
2) Create your environment file:
   ```bash
   cp .env.example .env
   ```
3) Fill in the required API keys in `.env`.
4) Start the dev server:
   ```bash
   pnpm  dev
   ```
5) Open http://localhost:3000

## Useful Scripts
- `pnpm dev` — Start the dev server
- `pnpm build` — Build for production
- `pnpm start` — Start the production server
- `pnpm lint` — Run ESLint

## Resources
- [AI SDK](https://ai-sdk.dev/docs/introduction)
- [Workflow SDK](https://useworkflow.dev/docs/getting-started)
- [Shadcn UI components](https://ui.shadcn.com/docs/components/alert)

## Code Copilot
* [Agents.md](https://developers.openai.com/codex/guides/agents-md/) `codex --ask-for-approval never "Summarize the current instructions."`


## Suggest Skills
* [plan](https://github.com/openai/skills/blob/main/skills/.experimental/create-plan/SKILL.md) Create for a complex task.

* Awesome Skills
   * [Awesome Skills](https://github.com/ComposioHQ/awesome-claude-skills)

## Suggest Codex Config
`~/config.toml`:
```toml
model = "gpt-5.2-codex"
model_reasoning_effort = "medium"

[features]
web_search_request = true
rmcp_client = true
experimental_use_rmcp_client = true # for figma mcp server

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[mcp_servers.chrome-devtools]
command = "npx"
args = ["chrome-devtools-mcp@latest"]

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
```
