# AGENTS.md
## Project Overview
1. Push the boundaries of LLM capabilities.
2. Automate high-frequency daily workflows.
3. Deliver practical, LLM-driven solutions to users.

## Project Snapshot
- **Code root**: `/code`
- **Framework**: Next.js v16
- **LLM**: AI SDK v6
- **UI**: Shadcn UI + Tailwind CSS

### Key Locations
- `/code/src/lib/model-factory.ts` — LLM model setup and configuration
- `/code/src/components/ui` — Reusable UI components

## Code Quality & Architecture
> Applies to all code changes unless explicitly stated.

- Use **English only** in code and documentation.
- Write **self-documenting code**:
  - Clear naming conventions
  - Modular structure
  - Avoid unnecessary comments
- Follow **Clean Architecture principles**:
  - Clear layering
  - Dependencies flow inward
- Keep each module focused on a **single responsibility**.
- Keep **one component per file**.
- Do not create or grow **god files** (large files mixing UI markup, business logic, and data access)
  - If a file exceeds **more than 300 lines** (excluding types/imports) or has more than **one primary responsibility** → refactor into smaller modules. UI components, hooks, and utility functions are exceptions.
- **TypeScript (strict)**:
  - Avoid `any`
  - Follow ESLint rules (`pnpm lint:fix` preferred)

## Technology Usage by Task
- **es-toolkit** → Utility functions

### Backend / Server
- **LLM interactions** → AI SDK
- **Workflow orchestration** → Workflow SDK

### Frontend / UI
- **Styling** → Tailwind CSS
- **UI components** → Shadcn UI (`/code/src/components/ui`)
- **Icons** → lucide-react
- **Data fetching & caching** → react-query
- **Search params state manager** → nuqs
