# WUEM Sim Intel — AI Guidelines

Guidelines for AI assistants working in this codebase.

## Stack & Conventions

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Radix UI. Components live in `src/app/components/`.
- **Backend**: Cloudflare Workers (Hono) in `worker/src/`. Database is Cloudflare D1 (SQLite). Storage is R2. Secrets via `wrangler secret`.
- **TypeScript**: No implicit `any`. All API responses must be strictly typed via shared types in `src/app/types.ts` and `worker/src/types.ts`.

## Code Style

- Follow existing naming conventions: kebab-case filenames, PascalCase components, camelCase functions.
- Tailwind only — no inline styles or external CSS unless in `src/styles/`.
- Dark mode parity is required for all UI changes; test both themes.
- All user input rendered to DOM must pass through DOMPurify (already wired in `src/app/utils/`).

## Security

- Never commit secrets or `.dev.vars` files.
- Use parameterized D1 queries — no string-interpolated SQL.
- New Worker routes must validate request bodies with Zod before processing.

## Clinical Context

- This is a clinical simulation platform for WashU Emergency Medicine. Reports and LSTs involve real institutional safety data.
- Follow **Just Culture** principles: reports focus on systemic issues, not individual blame.
- Do not add features that could expose patient-identifiable information.
