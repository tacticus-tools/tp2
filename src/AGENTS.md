# Frontend

## FSD Layers

Only import from **higher** layer numbers:

```
0-routes/        Pages (TanStack Router)
1-components/    UI components
2-integrations/  Third-party adapters (Convex, TanStack Query)
3-hooks/         Custom hooks
4-lib/           Utilities
5-assets/        Static assets
```

Layer 0 can import from 1–5. Layer 1 from 2–5. Etc. **Never import backwards.**

## TanStack Router

File-based routing in `0-routes/`:

```typescript
// 0-routes/myRoute.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/path")({
  component: RouteComponent,
  loader: async () => ({ data: "..." }),
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <div>{data}</div>;
}
```

Files map to paths:
- `index.tsx` → `/`
- `about.tsx` → `/about`
- `posts.$id.tsx` → `/posts/:id`

## Convex Integration

Use in components via TanStack Query:

```typescript
// 1-components/MyComponent.tsx
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "~/_generated/api";

export function MyComponent() {
  const { data } = useQuery(convexQuery(api.myFunc.get, { id: "x" }));
  return <div>{data}</div>;
}
```

## Imports

- `@/*` for `src/` files
- `~/*` for `convex/` files

```typescript
import { Button } from "@/1-components/ui/Button";
import type { Id } from "~/_generated/dataModel";
```

## Styling

Use `cn` utility from `4-lib/utils.ts` for Tailwind classes:

```typescript
import { cn } from "@/4-lib/utils";

function Button({ variant }: { variant: "primary" | "secondary" }) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded",
        variant === "primary" ? "bg-blue-500" : "bg-gray-300",
      )}
    >
      Click
    </button>
  );
}
```

The `cn` function merges Tailwind classes and resolves conflicts automatically.

## Environment Variables

Always import from `src/env.ts`:

```typescript
import { env } from "@/env";

const url = env.VITE_CONVEX_URL;
```

Never access `import.meta.env` directly.

## Docs

- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Start](https://tanstack.com/start/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
