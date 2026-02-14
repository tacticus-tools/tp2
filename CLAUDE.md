
## Agent Instructions

Always read and follow **`AGENTS.md`** before making any changes. It is the primary reference for project structure, technology choices, code conventions, and the pre-commit workflow.

---

## Architecture — Feature-Sliced Design (FSD)

This project uses a simplified FSD layer structure. Each `src/` folder is a layer, numbered by abstraction level. **Lower numbers are higher-level (closer to the user); higher numbers are lower-level (more reusable).**

```text
src/
  0-routes/        # Pages — TanStack Router file routes (one file per URL)
  1-components/    # Shared UI widgets and composite components
  2-integrations/  # Third-party service adapters (Convex, auth, devtools…)
  3-hooks/         # Shared React hooks and stores
  4-lib/           # Pure utilities, helpers, constants
  5-assets/        # Static assets (images, fonts, icons)
```

### Import direction rule

A layer may only import from layers with a **higher** number. Importing "up" is forbidden.

| Layer | May import from |
|---|---|
| `0-routes` | 1, 2, 3, 4, 5 |
| `1-components` | 2, 3, 4, 5 |
| `2-integrations` | 3, 4, 5 |
| `3-hooks` | 4, 5 |
| `4-lib` | 5 |
| `5-assets` | — |

`2-integrations` must **not** import from `1-components` or `0-routes`. `3-hooks` must **not** import from `2-integrations` or above.

### Where to put new code

- **New page / route** → `0-routes/` (TanStack Router file convention, e.g. `demo/my-feature.tsx`)
- **Reusable UI component** (button, card, modal) → `1-components/`
- **Third-party SDK wrapper** (auth, analytics, feature flags) → `2-integrations/<vendor>/`
- **Custom hook or Zustand store** → `3-hooks/`
- **Pure helper function, type, constant** → `4-lib/`

### Convex backend

Convex functions live in `convex/` (outside `src/`). They are not part of the FSD layer system. Frontend code imports generated types from `~/_generated/api` (alias `~` → `convex/`).

---

## Pre-commit checklist

**Always run `bun run build-ci` before staging any changes.** Fix all errors it reports before committing.

```sh
bun run build-ci
```

The command runs in order:
1. `biome check --fix` — auto-fixes Biome format + lint issues
2. `eslint --fix .` — auto-fixes ESLint issues
3. `biome check` — verifies no remaining Biome issues
4. `eslint .` — verifies no remaining ESLint issues
5. `vite build` — TypeScript type-check + production bundle

A commit must only be created after this command exits with code 0.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
