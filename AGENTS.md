# AI Agent Guide for tp2

This document provides guidance for AI agents working on the tp2 codebase. It covers project structure, key technologies, best practices, and development workflows.

## Project Overview

tp2 is a full-stack TypeScript application built with:
- **Frontend**: TanStack Start (file-based routing with TanStack Router)
- **Backend**: Convex (serverless backend-as-a-service)
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Base UI and Radix UI
- **Authentication**: `@convex-dev/auth` (Password + Anonymous providers)
- **State/Data Fetching**: TanStack Query integrated with Convex
- **Testing**: Vitest with Testing Library
- **Linting/Formatting**: Biome (primary) + ESLint (specialty plugins only)

## Project Structure

```
tp2/
├── convex/                    # Convex backend code
│   ├── schema.ts             # Database schema (includes authTables)
│   ├── auth.ts               # @convex-dev/auth setup (Password + Anonymous)
│   ├── http.ts               # HTTP routes (auth routes registered here)
│   └── *.ts                  # Convex functions (queries, mutations, actions)
├── src/                       # Frontend code — FSD layer architecture
│   ├── 0-routes/             # TanStack Router file-based routes (pages)
│   ├── 1-components/         # Reusable UI components
│   │   └── ui/               # shadcn/ui components
│   ├── 2-integrations/       # Third-party service adapters
│   │   ├── convex/           # Convex + auth provider setup
│   │   └── tanstack-query/   # TanStack Query configuration
│   ├── 3-hooks/              # Custom React hooks
│   ├── 4-lib/                # Utility functions and helpers
│   ├── 5-assets/             # Static assets (images, data)
│   ├── env.ts                # Environment variable validation (VITE_CONVEX_URL only)
│   ├── router.tsx            # Router configuration
│   └── styles.css            # Global styles
├── public/                    # Static assets (served as-is)
└── test-setup.tsx            # Test configuration
```

The numbered prefixes (0–5) in `src/` indicate FSD architectural layers — see **Architecture** section in `CLAUDE.md`.

## FSD Import Rule

A layer may only import from layers with a **higher** number. Never import "up".

## Key Technologies

### Convex Backend

Convex is a serverless backend platform that provides:
- **Real-time database**: Reactive queries that automatically update
- **Type-safe**: Full TypeScript support with generated types
- **Functions**: Queries (read), Mutations (write), Actions (external APIs)
- **Authentication**: `@convex-dev/auth`

#### Working with Convex

**Schema Definition** (`convex/schema.ts`):
```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables, // always spread authTables first
  tableName: defineTable({
    field: v.string(),
    optionalField: v.optional(v.number()),
    relationId: v.id("otherTable"),
  }).index("fieldName", ["field"]),
});
```

**System Fields**: Every document has `_id` and `_creationTime`. Don't define these manually.

**Validators**: Use `v.*` for type validation:
- `v.string()`, `v.number()`, `v.boolean()`, `v.bigint()`
- `v.id("tableName")` for references
- `v.optional(validator)` for optional fields
- `v.union(...)` for union types
- `v.object({...})`, `v.array(element)` for complex types

**Convex Functions**:
```typescript
// convex/myFunction.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { field: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tableName", args);
  },
});
```

**Calling from Frontend**:
```typescript
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/_generated/api";

const { data } = useQuery(convexQuery(api.myFunction.get, { id }));
```

**Resources**:
- [Convex Documentation](https://docs.convex.dev/)
- [Convex Database Types](https://docs.convex.dev/database/types)
- [Writing Convex Functions](https://docs.convex.dev/functions)

### Authentication

Authentication is handled by `@convex-dev/auth` (not Clerk).

- **Provider setup**: `src/2-integrations/convex/provider.tsx` — `ConvexAuthProvider`
- **Sign-in/sign-up page**: `src/0-routes/signin.tsx`
- **Header UI**: `src/2-integrations/convex/header-user.tsx` — uses `useAuthActions`, `Authenticated`, `Unauthenticated`

```typescript
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";

const { signIn, signOut } = useAuthActions();
await signIn("password", { email, password, flow: "signIn" | "signUp" });
await signIn("anonymous");
await signOut();
```

Getting the current user ID in a Convex function:
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = await getAuthUserId(ctx);
```

### TanStack Start & Router

TanStack Start is a full-stack React framework built on TanStack Router.

#### File-Based Routing

Routes are defined in `src/0-routes/`. The file structure maps to URL paths:
- `index.tsx` → `/`
- `about.tsx` → `/about`
- `posts/$postId.tsx` → `/posts/:postId` (dynamic route)

**Route Definition**:
```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/path")({
  component: RouteComponent,
  loader: async ({ context }) => {
    return await fetchData();
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <div>Content</div>;
}
```

**Root Route** (`src/0-routes/__root.tsx`):
- Defines the document shell (html, head, body)
- Wraps all routes with `ConvexProvider` (auth included)
- Use `shellComponent` for SSR-compatible document structure

**Navigation**:
```typescript
import { Link, useNavigate } from "@tanstack/react-router";

<Link to="/path">Link</Link>

const navigate = useNavigate();
navigate({ to: "/" });
```

**Resources**:
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Start Docs](https://tanstack.com/start/latest)

### TanStack Query Integration

The project uses `@convex-dev/react-query` for Convex + TanStack Query integration.

**Setup**: `src/2-integrations/convex/provider.tsx` using `ConvexQueryClient`.

**Usage**:
```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/_generated/api";

const { data, isLoading } = useQuery(convexQuery(api.file.functionName, { args }));
const mutation = useMutation({ mutationFn: ... });
```

## Development Workflow

### Setup

```bash
bun install
bun run dev       # start both frontend (port 3000) and backend in parallel
bun run dev:frontend
bun run dev:backend
```

### Environment Variables

Environment variables are validated using `@t3-oss/env-core` in `src/env.ts`.
Client-side vars must have `VITE_` prefix.

Required vars:
- `VITE_CONVEX_URL` — Convex deployment URL

### Pre-commit

**Always run `bun run build-ci` before staging changes.** Fix all errors before committing.

```bash
bun run build-ci
# runs: biome check --fix && eslint --fix . && biome check && eslint . && tsc --noEmit && vite build
```

### Testing

```bash
bun test           # run tests once
bun test:watch     # watch mode
bun test:ui        # Vitest UI
```

Tests use Vitest + Testing Library. Test setup is in `test-setup.tsx`.

### Linting & Formatting

```bash
bun run fix        # biome check --fix (auto-fix format + lint)
bun run check      # biome check (verify only)
bun run lint       # biome lint + eslint
```

Biome configuration is in `biome.json`. Uses tab indentation and double quotes.

**Files excluded from linting**:
- `src/routeTree.gen.ts` (auto-generated by router)
- `convex/_generated/**` (Convex generated files)
- `dist/**` (build output)

### Building & Deployment

```bash
bun run build     # build for production (Vite)
bun run preview   # preview production build
bun run deploy    # build + deploy to Cloudflare
```

## Code Conventions

### Import Aliases

Use `@/*` for `src/` imports:
```typescript
import Header from "@/1-components/Header";
```

Use `~/*` for `convex/` imports:
```typescript
import { api } from "~/_generated/api";
import type { Id } from "~/_generated/dataModel";
```

### Component Structure

- Route pages → `src/0-routes/`
- Reusable UI components → `src/1-components/`
- UI primitives (shadcn/ui) → `src/1-components/ui/`
- Third-party adapters → `src/2-integrations/<vendor>/`
- Custom hooks → `src/3-hooks/`
- Utilities → `src/4-lib/`

### Styling

- Use Tailwind CSS v4 utility classes
- Use `clsx` or `tailwind-merge` for conditional classes
- Component variants via `class-variance-authority`

### Type Safety

- Strict TypeScript (already configured)
- Convex validators (`v.*`) for runtime safety
- Type-safe TanStack Router routing
- Zod for environment / form validation

## Common Patterns

### Creating a New Route

1. Add file in `src/0-routes/` (e.g., `myRoute.tsx`)
2. TanStack Router auto-generates route config in dev mode
3. Define route with `createFileRoute`
4. Access route data with `Route.useLoaderData()` or `Route.useParams()`

### Adding a Convex Table

1. Update `convex/schema.ts` with `defineTable` (keep `...authTables` spread)
2. Create corresponding functions in `convex/*.ts`
3. Use `useQuery`/`useMutation` from `convex/react` in components

### Adding a UI Component

1. For shadcn/ui: follow patterns in `src/1-components/ui/`
2. For custom: add to `src/1-components/`
3. Use Tailwind for styling, export from the file

### Form Handling

Use `@tanstack/react-form`:
```typescript
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: { field: "" },
    onSubmit: async ({ value }) => { /* handle submit */ },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="field">
        {(field) => <input {...field.api} />}
      </form.Field>
    </form>
  );
}
```

## Troubleshooting

### Convex Issues

- **Schema changes not applying**: Restart `bun run dev:backend`
- **Generated types out of sync**: Convex dev server auto-generates types
- **Query not updating**: Convex queries are reactive; check query args

### Router Issues

- **Routes not found**: Check file name matches expected path
- **Types not generated**: Ensure dev server is running (auto-generates `routeTree.gen.ts`)
- **Link navigation broken**: Verify `to` prop matches route path

### Build Issues

- **Type errors**: Run `bun run check` and fix TypeScript errors
- **Biome errors**: Run `bun run fix` to auto-fix
- **Import resolution**: Check `tsconfig.json` paths and `vite.config.ts`
- **Cloudflare Worker SSR hang**: Ensure `ssr.noExternal` in `vite.config.ts` includes packages with `"use client"` directives (e.g. `@convex-dev/auth`)

## Important Notes for AI Agents

1. **Generated Files** — never edit:
   - `src/routeTree.gen.ts`
   - `convex/_generated/**`

2. **Convex Schema** — always keep `...authTables` spread at the top of `defineSchema`

3. **Authentication** — use `@convex-dev/auth`, not Clerk (Clerk has been removed)

4. **Routing** — use TanStack Router file-based routing, not React Router patterns

5. **Imports** — use `@/` alias for `src/`, `~/` alias for `convex/`

6. **Runtime** — use `bun` commands, not `npm` or `yarn`

7. **Styling** — use Tailwind v4 syntax (Vite plugin, not PostCSS)

8. **Pre-commit** — always run `bun run build-ci` and fix all errors before committing

9. **FSD layers** — respect the import direction rule; a layer only imports from higher-numbered layers

10. **Testing** — write tests in `.test.tsx` files next to components

## Additional Resources

- [TanStack Router Guide](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts)
- [Convex Quickstart](https://docs.convex.dev/quickstart)
- [Convex Auth](https://labs.convex.dev/auth)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Biome Configuration](https://biomejs.dev/reference/configuration/)
- [Vitest Documentation](https://vitest.dev/)
