# Convex Backend

## Setup

```bash
bun run dev:backend
```

## Schema Rules

**Always spread `...authTables` first** in `defineSchema`:

```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
  }),
  sessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
  }).index("sessionId", ["sessionId"]),
});
```

## Validators (v.*)

Common validators:
- `v.string()`, `v.number()`, `v.boolean()`, `v.bigint()`
- `v.id("tableName")` — reference to another table
- `v.optional(validator)` — optional field
- `v.union(...)` — union types
- `v.object({...})`, `v.array(element)` — complex types

## System Fields

Every document automatically has:
- `_id` — document ID
- `_creationTime` — creation timestamp (ms since epoch)

Don't define these manually. Indices on `_id` and `_creationTime` are automatic.

## Functions

**Query** (read-only):
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

**Mutation** (write):
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { field: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tableName", args);
  },
});
```

**Get current user ID**:
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = await getAuthUserId(ctx);
```

## Docs

- [Convex Database Types](https://docs.convex.dev/database/types)
- [Convex Functions](https://docs.convex.dev/functions)
- [Convex Auth](https://labs.convex.dev/auth)