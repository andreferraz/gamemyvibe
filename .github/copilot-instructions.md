# Copilot Instructions for Steamder

## Core Rules

- Keep changes small, focused, and aligned with the MVP roadmap in `ROADMAP.md`.
- Use `pnpm` for all package and script commands.
- Do not use `npm` or `yarn` commands.
- When a roadmap task is completed, update `ROADMAP.md` by checking the corresponding checkbox.
- Make sure to encapsulate blocks of UI in separate and reusable components in the src/components folder with a clear and descriptive name when appropriate.
- For API routes, ensure that the handlers are modular and can be easily tested.

## Package Manager and Commands

- Whenever running `pnpm lint`, always run `pnpm format` before to ensure code style consistency. For example: `pnpm format && pnpm lint`.
- Don't bother running `pnpm build` and `pnpm start` during development.

## Implementation Style

- Prefer clear TypeScript types for IGDB payloads and recommendation data.
- Keep API handlers and frontend logic modular and testable.
- Avoid unnecessary backend processing for recommendation math; prefer client-side computation.
- **Always avoid duplicating code.** When a function or logic is needed in multiple places, extract it into a shared utility or module and reuse it instead of copying. Check for existing utilities before writing new code.
