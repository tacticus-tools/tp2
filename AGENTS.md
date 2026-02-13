# AI Agent Guide for tp2

This document provides guidance for AI agents working on the tp2 codebase. It covers project structure, key technologies, best practices, and development workflows.

## Project Overview

tp2 is a full-stack TypeScript application built with:
- **Frontend**: TanStack Start (file-based routing with TanStack Router)
- **Backend**: Convex (serverless backend-as-a-service)
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Base UI and Radix UI
- **Authentication**: Clerk
- **State/Data Fetching**: TanStack Query integrated with Convex
- **Testing**: Vitest with Testing Library
- **Linting/Formatting**: Biome

## Project Structure

```
tp2/
├── convex/                    # Convex backend code
│   ├── schema.ts             # Database schema definitions
│   ├── auth.config.ts        # Authentication configuration
│   └── *.ts                  # Convex functions (queries, mutations, actions)
├── src/                       # Frontend code
│   ├── 0-routes/             # TanStack Router file-based routes
│   ├── 1-components/         # Reusable UI components
│   │   └── ui/               # shadcn/ui components
│   ├── 2-integrations/       # Third-party integrations
│   │   ├── clerk/            # Clerk authentication
│   │   ├── convex/           # Convex provider setup
│   │   └── tanstack-query/   # TanStack Query configuration
│   ├── 3-hooks/              # Custom React hooks
│   ├── 4-lib/                # Utility functions and helpers
│   ├── 5-assets/             # Static assets (images, data)
│   ├── env.ts                # Environment variable validation
│   ├── router.tsx            # Router configuration
│   └── styles.css            # Global styles
├── public/                    # Static assets (served as-is)
└── test-setup.tsx            # Test configuration

```

The numbered prefixes (0-5) in src/ indicate import order and architectural layers, preventing circular dependencies.

## Key Technologies

### Convex Backend

Convex is a serverless backend platform that provides:
- **Real-time database**: Reactive queries that automatically update
- **Type-safe**: Full TypeScript support with generated types
- **Functions**: Queries (read), Mutations (write), Actions (external APIs)
- **Authentication**: Integrated with Clerk

#### Working with Convex

**Schema Definition** (`convex/schema.ts`):
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tableName: defineTable({
    field: v.string(),
    optionalField: v.optional(v.number()),
    relationId: v.id("otherTable"),
  }).index("fieldName", ["field"]),
});
```

**System Fields**: Every document has `_id` (document ID) and `_creationTime` (timestamp). Don't define these manually.

**Validators**: Use `v.*` for type validation:
- `v.string()`, `v.number()`, `v.boolean()`, `v.bigint()`
- `v.id("tableName")` for references
- `v.optional(validator)` for optional fields
- `v.union(...)` for union types
- `v.object({...})`, `v.array(element)` for complex types

**Convex Functions** (queries/mutations):
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
import { useQuery, useMutation } from "@convex-dev/react-query";
import { api } from "~/_generated/api";

// In component
const data = useQuery(api.myFunction.get, { id });
const createMutation = useMutation(api.myFunction.create);
```

**Resources**:
- [Convex Documentation](https://docs.convex.dev/)
- [Convex Database Types](https://docs.convex.dev/database/types)
- [Writing Convex Functions](https://docs.convex.dev/functions)

### TanStack Start & Router

TanStack Start is a full-stack React framework built on TanStack Router.

#### File-Based Routing

Routes are defined in `src/0-routes/`. The file structure maps to URL paths:
- `index.tsx` → `/`
- `about.tsx` → `/about`
- `posts/$postId.tsx` → `/posts/:postId` (dynamic route)
- `_layout.tsx` → layout route (no path segment)

**Route Definition**:
```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/path")({
  component: RouteComponent,
  // Optional: load data before rendering
  loader: async ({ context }) => {
    return await fetchData();
  },
});

function RouteComponent() {
  const data = Route.useLoaderData(); // if using loader
  return <div>Content</div>;
}
```

**Root Route** (`src/0-routes/__root.tsx`):
- Defines the document shell (html, head, body)
- Wraps all routes with providers (Clerk, Convex, etc.)
- Use `shellComponent` for SSR-compatible document structure

**Navigation**:
```typescript
import { Link } from "@tanstack/react-router";

<Link to="/path" params={{ id: "123" }}>Link</Link>
```

**Data Loading Best Practices**:
1. Use `loader` for SSR-compatible data fetching
2. Integrate with TanStack Query for caching/revalidation
3. The router is configured with SSR Query integration in `src/router.tsx`

**Resources**:
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Start Docs](https://tanstack.com/start/latest)
- [File-Based Routing Guide](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)

### TanStack Query Integration

The project uses `@convex-dev/react-query` for seamless Convex + TanStack Query integration.

**Setup**: Provider is in `src/2-integrations/convex/provider.tsx` using `ConvexQueryClient`.

**Usage**:
```typescript
import { useQuery, useMutation } from "@convex-dev/react-query";
import { api } from "~/_generated/api";

// Query
const { data, isLoading } = useQuery(api.file.functionName, { args });

// Mutation
const mutation = useMutation(api.file.functionName);
mutation.mutate({ args });
```

Benefits:
- Automatic caching and revalidation
- Optimistic updates
- Request deduplication
- SSR support with router integration

## Development Workflow

### Setup

```bash
# Install dependencies and configure Convex
bun init

# Start both frontend and backend
bun dev

# Or separately:
bun dev:frontend  # Port 3000
bun dev:backend   # Convex dev server
```

### Environment Variables

Environment variables are validated using `@t3-oss/env-core` in `src/env.ts`:
- Client-side vars must have `VITE_` prefix
- Required vars: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL`

### Testing

```bash
bun test           # Run tests once
bun test:watch     # Watch mode
bun test:ui        # Vitest UI
```

Tests use Vitest + Testing Library. Test setup is in `test-setup.tsx`.

### Linting & Formatting

```bash
bun lint           # Check for issues
bun format         # Format code
bun check          # Lint + format check
bun fix            # Auto-fix issues
```

Biome configuration is in `biome.json`. It uses:
- Tab indentation
- Double quotes
- Organized imports

**Files excluded from linting**:
- `src/routeTree.gen.ts` (auto-generated by router)
- `src/styles.css` (Tailwind directives)
- `convex/_generated/**` (Convex generated files)

### Building & Deployment

```bash
bun build         # Build for production (Vite)
bun preview       # Preview production build
bun deploy        # Build + deploy to Cloudflare
```

The project is configured for Cloudflare deployment via Wrangler.

## Code Conventions

### Import Aliases

Use `@/*` for imports from `src/`:
```typescript
import Header from "@/1-components/Header";
```

Use `~/*` for imports from `convex/`:
```typescript
import { api } from "~/_generated/api";
import type { Id } from "~/_generated/dataModel";
```

### Component Structure

Follow existing patterns:
- Components in `src/1-components/`
- UI primitives in `src/1-components/ui/` (shadcn/ui)
- Custom hooks in `src/3-hooks/`
- Utilities in `src/4-lib/`

### Styling

- Use Tailwind CSS v4 utility classes
- Use `clsx` or `tailwind-merge` for conditional classes
- Component variants via `class-variance-authority`

### Type Safety

- Enable strict TypeScript settings (already configured)
- Use Convex validators for runtime type safety
- Leverage TanStack Router's type-safe routing
- Use Zod for environment/form validation

## Common Patterns

### Creating a New Route

1. Add file in `src/0-routes/` (e.g., `myRoute.tsx`)
2. TanStack generates route config automatically (in dev mode)
3. Define route with `createFileRoute`
4. Access route data with `Route.useLoaderData()` or `Route.useParams()`

### Adding a Convex Table

1. Update `convex/schema.ts` with `defineTable`
2. Create corresponding functions in `convex/*.ts`
3. Use `useQuery`/`useMutation` from `@convex-dev/react-query` in components

### Adding a UI Component

1. For shadcn/ui: Follow shadcn patterns in `src/1-components/ui/`
2. For custom components: Add to `src/1-components/`
3. Use Tailwind for styling
4. Export from component file

### Form Handling

Use `@tanstack/react-form` (already installed):
```typescript
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: { field: "" },
    onSubmit: async ({ value }) => {
      // Handle submit
    },
  });
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="field">
        {(field) => <input {...field} />}
      </form.Field>
    </form>
  );
}
```

## Troubleshooting

### Convex Issues

- **Schema changes not applying**: Run `bun dev:backend` to push schema
- **Generated types out of sync**: Convex dev server auto-generates types
- **Query not updating**: Convex queries are reactive; check query args

### Router Issues

- **Routes not found**: Check file name matches expected path
- **Types not generated**: Ensure dev server is running (auto-generates `routeTree.gen.ts`)
- **Link navigation broken**: Verify `to` prop matches route path

### Build Issues

- **Type errors**: Run `bun check` and fix TypeScript errors
- **Biome errors**: Run `bun fix` to auto-fix formatting/linting
- **Import resolution**: Check `tsconfig.json` paths and Vite config

## Important Notes for AI Agents

1. **Generated Files**: Never edit:
   - `src/routeTree.gen.ts`
   - `convex/_generated/**`
   
2. **Convex Functions**: Always use proper validators with `v.*`

3. **Routing**: Use TanStack Router's file-based routing, not React Router patterns

4. **Imports**: Use `@/` alias for src imports, relative paths for convex imports

5. **Bun**: Use `bun` commands, not `npm` or `yarn`

6. **Styling**: Use Tailwind v4 syntax (the project uses the Vite plugin)

7. **Authentication**: Clerk is already configured; use `useAuth()` from `@clerk/clerk-react`

8. **Testing**: Write tests in `.test.tsx` files next to components or in `__tests__` directories

## Additional Resources

- [TanStack Router Guide](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts)
- [Convex Quickstart](https://docs.convex.dev/quickstart)
- [Clerk + Convex Integration](https://docs.convex.dev/auth/clerk)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Biome Configuration](https://biomejs.dev/reference/configuration/)
- [Vitest Documentation](https://vitest.dev/)
