# Copilot Instructions for Steamder

## Core Rules

- Keep changes small, focused, and aligned with the MVP roadmap in `ROADMAP.md`.
- Use `pnpm` for all package and script commands.
- Do not use `npm` or `yarn` commands.
- When a roadmap task is completed, update `ROADMAP.md` by checking the corresponding checkbox.
- Make sure to encapsulate blocks of UI in separate and reusable components in the src/components folder with a clear and descriptive name when appropriate.
- For API routes, ensure that the handlers are modular and can be easily tested.

## Package Manager and Commands

- Install dependencies: `pnpm install`
- Run dev server: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Lint/type checks/tests: use available `pnpm` scripts from `package.json`

Whenever running `pnpm lint`, always run `pnpm format` before to ensure code style consistency. For example: `pnpm format && pnpm lint`.

## Product Context (MVP)

Steamder is a zero-infrastructure game recommendation app with:

- A Tinder-style discovery flow for games.
- Local ML inference in the browser using TensorFlow.js + Universal Sentence Encoder.
- Real-time recommendation updates via vector math and cosine similarity.
- Privacy-first behavior with client-side preference processing.

## Roadmap Priorities

1. Backend API routes:

- `/api/igdb/discovery`: 20-30 recognizable games for interaction.
- `/api/igdb/candidates`: fixed pool of 100 popular games for recommendations.

2. Frontend layout and state:

- Split-screen UI: discovery card on left, recommendation list on right.
- Local `userPreferences` state storing game id, embedding, and weight.

3. Embedded ML engine:

- Load Universal Sentence Encoder on page mount.
- Pre-vectorize and cache candidate embeddings on load.

4. Real-time adaptation:

- Apply weights for actions: like `+1.0`, love `+2.0`, uninterested negative weight.
- Recompute profile vector and refresh ranked recommendations instantly.

## Implementation Style

- Prefer clear TypeScript types for IGDB payloads and recommendation data.
- Keep API handlers and frontend logic modular and testable.
- Avoid unnecessary backend processing for recommendation math; prefer client-side computation.
- **Always avoid duplicating code.** When a function or logic is needed in multiple places, extract it into a shared utility or module and reuse it instead of copying. Check for existing utilities before writing new code.
