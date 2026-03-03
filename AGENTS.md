# AGENTS.md

## Setup
```bash
bun install
bun run dev
bun run build-ci  # REQUIRED before commit
```

## Structure
- `convex/` — Backend (Convex functions + schema)
- `src/` — Frontend (React components + routes)
- `common/` — Shared code (Types, utils, etc.)

## Rules
1. Never edit: `src/routeTree.gen.ts`, `convex/_generated/`, or `*.generated.*` files
2. Use Bun only (not npm/yarn)
3. Use `@/*` for `src/`, `~/*` for `convex/`, `#common/*` for `common/`
4. Run `bun run build-ci` before every commit

## Tech
- **Runtime**: Bun
- **Frontend**: TanStack Start + Router
- **Backend**: Convex
- **Auth**: `@convex-dev/auth`
- **Styling**: Tailwind CSS v4
- **Lint**: Biome

## Key Commands
```bash
bun run dev      # frontend + backend
bun run fix      # lint/format
bun test         # run tests
```

## Docs
- [Convex](https://docs.convex.dev/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Start](https://tanstack.com/start/latest)
