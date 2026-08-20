<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hana Studio Development Rules

## Architecture Principles

- Keep the architecture modular with clear domain boundaries under `src/features/`.
- Avoid unnecessary dependencies. Only add a dependency when there is a concrete need.
- Do not overengineer. Keep abstractions simple and justified.
- Do not implement future milestones prematurely. Work only on the current milestone.
- Keep domain logic separate from UI components.
- Keep editor state separate from persistence.
- Keep rendering separate from the interactive editor.

## Code Conventions

- Use TypeScript consistently across the entire codebase.
- Prefer official and current documentation when implementing any library.
- Preserve backward-compatible data contracts where possible.
- Do not modify unrelated files. Keep changes focused on the current task.
- Do not add comments unless asked. Write self-documenting code instead.
- Follow existing patterns and naming conventions in the codebase.

## File Organization

- `src/app/` — Next.js App Router pages and layouts.
- `src/components/` — Shared UI components.
- `src/features/` — Domain-specific modules with their own components, hooks, and logic.
- `src/lib/` — Utility functions and shared helpers.
- `src/server/` — Server-side logic (database access, API handlers).
- `src/stores/` — Client-side state management (Zustand stores).
- `src/types/` — Shared TypeScript type definitions.
- `prisma/` — Database schema and migrations.

## Testing and Quality

- Run `npm run lint` before committing.
- Do not introduce features without considering their impact on existing functionality.
