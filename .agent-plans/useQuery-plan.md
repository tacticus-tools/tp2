# useQuery Refactoring Plan

## ✅ COMPLETION STATUS
- **File 1 (campaign-progression.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 2 (goals.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 3 (gw-offense.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 4 (lre.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 5 (roster-snapshots.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 6 (teams.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 7 (index.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 8 (roster.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **File 9 (CampaignProgressSync.tsx):** ✅ COMPLETE - Implementation matches plan exactly
- **Bonus File (settings.tsx):** ✅ ALREADY MIGRATED - No action needed
- **Codebase Scan:** ✅ COMPLETE - No remaining old-style useQuery issues found

## 📋 REVIEW NOTES

### File 1: campaign-progression.tsx
**Status:** ✅ Perfect implementation
- ✅ Imports correctly updated (added `convexQuery` from `@convex-dev/react-query`)
- ✅ Changed from `useQuery` to TanStack `useQuery`
- ✅ Variable renamed to `goalsQuery`
- ✅ All data accesses updated to `goalsQuery.data`
- ✅ Dependency checks updated to `goalsQuery.isPending`
- ✅ No unnecessary changes

### File 2: goals.tsx
**Status:** ✅ Perfect implementation
- ✅ Mixed imports handled correctly: `useMutation` stays in `convex/react`, `useQuery` moved to `@tanstack/react-query`
- ✅ `convexQuery` import added from `@convex-dev/react-query`
- ✅ Variable renamed to `goalsQuery` (line 197)
- ✅ All mutations remain unchanged (`removeGoal`, `removeAllGoals`, `updateGoal`, `reorderGoals`)
- ✅ Data accesses throughout file use `goalsQuery.data`
- ✅ Excellent implementation with no issues detected

**Key observation:** The developer correctly maintained the pattern of keeping all `useMutation` calls from `convex/react` while only converting `useQuery` to the new pattern. This is the right approach and should be replicated in remaining files.

## Overview
The codebase has **9 files** that are using `useQuery` from `convex/react` instead of following the correct TanStack Query pattern with `@convex-dev/react-query`. The infrastructure is already set up correctly in `src/2-integrations/convex/provider.tsx`, and `src/0-routes/_authenticated/settings.tsx` demonstrates the correct pattern to follow.

## Current Setup (Already Correct)
The project has:
- ✅ `ConvexQueryClient` configured in provider
- ✅ `QueryClient` with proper defaults
- ✅ Both `ConvexProvider` and `QueryClientProvider` wrapping the app
- ✅ Example of correct usage in `settings.tsx`

## Naming Convention
All variables returned from `useQuery` should be postfixed with `Query` and **not destructured**. This prevents name conflicts when additional queries are added later.

**Correct pattern:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

// Usage - DO NOT destructure:
const goalsQuery = useQuery(convexQuery(api.goals.list));
// Access: goalsQuery.data, goalsQuery.isPending, goalsQuery.error

// Or with additional options:
const credentialsQuery = useQuery({
  ...convexQuery(api.tacticus.credentials.get),
  initialData: [],
});
// Access: credentialsQuery.data, credentialsQuery.isPending
```

---

## Files to Refactor

### 1. `src/0-routes/_authenticated/campaign-progression.tsx`

**Location:** Line 2, Line 35

**Current Code:**
```typescript
import { useQuery } from "convex/react";
// ...
function CampaignProgressionPage() {
  const goals = useQuery(api.goals.list);
```

**Refactoring Steps:**
1. Replace import on line 2: `import { useQuery } from "@tanstack/react-query"`
2. Add new import: `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 35 query:
   - From: `const goals = useQuery(api.goals.list);`
   - To: `const goalsQuery = useQuery(convexQuery(api.goals.list));`
4. Update all data accesses throughout the component:
   - Replace: `goals` → `goalsQuery.data`
   - Replace: `if (!goals)` → `if (goalsQuery.isPending)`
5. Update effect dependencies to reference `goalsQuery.data` if needed

**Notes:** Simple single query with no arguments. Straightforward refactoring.

---

### 2. `src/0-routes/_authenticated/goals.tsx`

**Location:** Line 2, Line 197

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
function GoalsPage() {
  const goals = useQuery(api.goals.list);
  const removeGoal = useMutation(api.goals.remove);
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 197 query:
   - From: `const goals = useQuery(api.goals.list);`
   - To: `const goalsQuery = useQuery(convexQuery(api.goals.list));`
4. Keep all `useMutation` calls unchanged (they stay from `convex/react`)
5. Update all data accesses:
   - Replace: `goals` → `goalsQuery.data`
   - Replace: `if (!goals)` → `if (goalsQuery.isPending)`
   - Replace: `goals?.map()` → `goalsQuery.data?.map()`

**Notes:** Mixed imports - keep mutations from `convex/react`, move only `useQuery` to TanStack. Single query, no arguments.

---

### 3. `src/0-routes/_authenticated/gw-offense.tsx`

**Location:** Line 2, Line 30-31

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
function GwOffensePage() {
  const doc = useQuery(api.gwOffense.get);
  const saveGw = useMutation(api.gwOffense.save);
  const teams = useQuery(api.teams.list);
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 30 query:
   - From: `const doc = useQuery(api.gwOffense.get);`
   - To: `const docQuery = useQuery(convexQuery(api.gwOffense.get));`
4. Update line 31 query:
   - From: `const teams = useQuery(api.teams.list);`
   - To: `const teamsQuery = useQuery(convexQuery(api.teams.list));`
5. Keep `saveGw` mutation unchanged
6. Update all data accesses:
   - Replace: `doc` → `docQuery.data`
   - Replace: `doc?.bfLevel` → `docQuery.data?.bfLevel`
   - Replace: `teams` → `teamsQuery.data`
   - Replace: `if (!teams)` → `if (teamsQuery.isPending)`

**Notes:** Two queries, both no arguments. Using postfix naming prevents conflicts if more queries are added later.

---

### 4. `src/0-routes/_authenticated/lre.tsx`

**Location:** Line 2, Line 144-146

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
function LrePage() {
  const teams = useQuery(api.lre.listTeams, { eventId: selectedEventId });
  const savedProgress = useQuery(api.lre.getProgress, {
    eventId: selectedEventId,
  });
  const saveProgressMutation = useMutation(api.lre.saveProgress);
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update lines 144-146:
   ```typescript
   const teamsQuery = useQuery(
     convexQuery(api.lre.listTeams, { eventId: selectedEventId })
   );
   const savedProgressQuery = useQuery(
     convexQuery(api.lre.getProgress, { eventId: selectedEventId })
   );
   ```
4. Keep all mutations unchanged
5. Update all data accesses:
   - Replace: `teams` → `teamsQuery.data`
   - Replace: `savedProgress` → `savedProgressQuery.data`
   - Replace: `if (!teams)` → `if (teamsQuery.isPending)`
6. Note: TanStack Query automatically tracks `selectedEventId` changes via query keys, so dependent updates work seamlessly

**Notes:** Two queries with arguments. The query keys will automatically update when `selectedEventId` changes - no additional dependency tracking needed.

---

### 5. `src/0-routes/_authenticated/roster-snapshots.tsx`

**Location:** Line 2, Line 57

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
function RosterSnapshotsPage() {
  const doc = useQuery(api.rosterSnapshots.get);
  const save = useMutation(api.rosterSnapshots.save);
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 57:
   - From: `const doc = useQuery(api.rosterSnapshots.get);`
   - To: `const docQuery = useQuery(convexQuery(api.rosterSnapshots.get));`
4. Keep `save` mutation unchanged
5. Update all data accesses:
   - Replace: `doc` → `docQuery.data`
   - Replace: `if (!doc)` → `if (docQuery.isPending)`

**Notes:** Simple single query with no arguments.

---

### 6. `src/0-routes/_authenticated/teams.tsx`

**Location:** Line 2, Line 30

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
function TeamsPage() {
  const teams = useQuery(api.teams.list);
  const addTeam = useMutation(api.teams.add);
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 30:
   - From: `const teams = useQuery(api.teams.list);`
   - To: `const teamsQuery = useQuery(convexQuery(api.teams.list));`
4. Keep all mutations unchanged
5. Update all data accesses:
   - Replace: `teams` → `teamsQuery.data`
   - Replace: `if (!teams) return []` → `if (teamsQuery.isPending) return []`
   - Replace: `[...teams]` → `[...teamsQuery.data]` or similar array operations

**Notes:** Simple single query with no arguments.

---

### 7. `src/0-routes/index.tsx`

**Location:** Line 2, Line 151

**Current Code:**
```typescript
import { useAction, useConvexAuth, useQuery } from "convex/react";
// ...
function Dashboard() {
  const credentials = useQuery(api.tacticus.credentials.get);

  if (credentials === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
```

**Refactoring Steps:**
1. Update line 2 imports:
   - From: `import { useAction, useConvexAuth, useQuery } from "convex/react";`
   - To: `import { useAction, useConvexAuth } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update line 151:
   - From: `const credentials = useQuery(api.tacticus.credentials.get);`
   - To: `const credentialsQuery = useQuery(convexQuery(api.tacticus.credentials.get));`
4. Update the check starting at line 153:
   - From: `if (credentials === undefined) { return <Loading /> }`
   - To: `if (credentialsQuery.isPending) { return <Loading /> }`
5. Update data access:
   - Replace: `!credentials` → `!credentialsQuery.data`
   - Replace: `credentials.tacticus_user_id` → `credentialsQuery.data?.tacticus_user_id` or similar
6. Keep `useAction` and `useConvexAuth` unchanged

**Notes:** Mixed imports - keep other Convex hooks from `convex/react`. This is the dashboard, widely used.

---

### 8. `src/0-routes/shared/roster.tsx`

**Location:** Line 2, Line 33

**Current Code:**
```typescript
import { useQuery } from "convex/react";
// ...
function SharedRosterPage() {
  const { token } = useSearch({ from: "/shared/roster" });
  const data = useQuery(api.roster.getShared, token ? { token } : "skip");

  const [search, setSearch] = useState("");
  // ...
  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
```

**Refactoring Steps:**
1. Replace line 2:
   - From: `import { useQuery } from "convex/react";`
   - To: `import { useQuery } from "@tanstack/react-query"`
2. Add new import: `import { convexQuery } from "@convex-dev/react-query"`
3. **IMPORTANT:** The "skip" pattern doesn't exist in TanStack Query - use `enabled` instead
4. Update line 33:
   ```typescript
   const dataQuery = useQuery({
     ...convexQuery(api.roster.getShared, { token }),
     enabled: !!token,
   });
   ```
5. Update the loading check around line 48:
   ```typescript
   if (!token) {
     return (
       <div className="py-20 text-center text-muted-foreground">
         No roster token provided.
       </div>
     );
   }
   
   if (dataQuery.isPending) {
     return (
       <div className="flex items-center justify-center py-20">
         <Loader2 className="size-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
   ```
6. Update all data accesses:
   - Replace: `data?.roster` → `dataQuery.data?.roster`
   - Replace: `data.roster` → `dataQuery.data.roster`

**Notes:** **Special case** - This query has conditional arguments using the "skip" pattern. TanStack Query uses the `enabled` option instead. When `enabled: false`, the query won't run and will stay in `isPending: false` state.

---

### 9. `src/1-components/CampaignProgressSync.tsx`

**Location:** Line 1, Line 15-16

**Current Code:**
```typescript
import { useMutation, useQuery } from "convex/react";
// ...
export function CampaignProgressSync() {
  const convexDoc = useQuery(api.campaignProgress.get);
  const saveMutation = useMutation(api.campaignProgress.save);

  const convexMergedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);

  // Phase A: Load from Convex (once per session)
  useEffect(() => {
    if (convexMergedRef.current) return;
    // convexDoc is undefined while loading, null if no row exists
    if (convexDoc === undefined) return;
```

**Refactoring Steps:**
1. Update line 1 imports:
   - From: `import { useMutation, useQuery } from "convex/react";`
   - To: `import { useMutation } from "convex/react";`
2. Add new imports:
   - `import { useQuery } from "@tanstack/react-query"`
   - `import { convexQuery } from "@convex-dev/react-query"`
3. Update lines 15-16:
   - From: `const convexDoc = useQuery(api.campaignProgress.get);`
   - To: `const convexDocQuery = useQuery(convexQuery(api.campaignProgress.get));`
4. Update the check at line 25:
   - From: `if (convexDoc === undefined) return;`
   - To: `if (convexDocQuery.data === undefined) return;`
5. Update all data accesses throughout the component:
   - Replace: `convexDoc` → `convexDocQuery.data`
   - Replace: `convexDoc?.data` → `convexDocQuery.data?.data`
6. Keep `saveMutation` unchanged
7. Verify that the sync logic still works correctly with the new query structure
8. The reactive subscription should still work - Convex maintains live updates through TanStack Query

**Notes:** **Headless sync component** - Be careful with this refactoring. This component doesn't render directly but manages state synchronization. The reactive updates from Convex will still work because the `ConvexQueryClient` maintains WebSocket subscriptions. Just ensure that all data accesses use the `Query` variable correctly.

---

## Summary of Changes

### Import Pattern Changes

**Pattern 1: File with only `useQuery`**
```typescript
// BEFORE
import { useQuery } from "convex/react";

// AFTER
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
```

**Pattern 2: File with `useQuery` and `useMutation`**
```typescript
// BEFORE
import { useMutation, useQuery } from "convex/react";

// AFTER
import { useMutation } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
```

**Pattern 3: File with `useQuery` and other Convex hooks**
```typescript
// BEFORE
import { useAction, useConvexAuth, useQuery } from "convex/react";

// AFTER
import { useAction, useConvexAuth } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
```

### Hook Call Pattern Changes

**Simple query (no arguments) - DO NOT DESTRUCTURE:**
```typescript
// BEFORE
const data = useQuery(api.function.name);
// Access: data, data?.field, if (!data)

// AFTER
const dataQuery = useQuery(convexQuery(api.function.name));
// Access: dataQuery.data, dataQuery.data?.field, if (dataQuery.isPending)
```

**Query with arguments - DO NOT DESTRUCTURE:**
```typescript
// BEFORE
const data = useQuery(api.function.name, { arg: value });

// AFTER
const dataQuery = useQuery(
  convexQuery(api.function.name, { arg: value })
);
```

**Conditional query (skip pattern) - DO NOT DESTRUCTURE:**
```typescript
// BEFORE
const data = useQuery(api.function.name, condition ? { arg } : "skip");

// AFTER
const dataQuery = useQuery({
  ...convexQuery(api.function.name, { arg }),
  enabled: condition,
});
```

### Data Access Pattern Changes

```typescript
// BEFORE
if (!data) return <Loading />;
if (data === undefined) return <Loading />;
const value = data.field;
const mapped = data.map(item => ...);

// AFTER
if (dataQuery.isPending) return <Loading />;
if (dataQuery.data === undefined) return <Loading />;
const value = dataQuery.data.field;
const mapped = dataQuery.data?.map(item => ...);
```

---

## Testing Checklist

After refactoring each file, verify:
- [ ] Data loads correctly on page/component mount
- [ ] Loading spinner displays while data is fetching
- [ ] Data displays correctly once loaded
- [ ] Reactive updates work (Convex live subscriptions)
- [ ] Error states display if applicable
- [ ] Dependent queries update when parameters change
- [ ] Mutations still work with the refactored queries
- [ ] No console errors or warnings

---

## Implementation Order (Recommended)

Start with simpler refactorings, move to complex ones:

1. **File 1: campaign-progression.tsx** - Single simple query
2. **File 5: roster-snapshots.tsx** - Single simple query
3. **File 6: teams.tsx** - Single simple query
4. **File 7: index.tsx** - Single simple query (widely used, good reference)
5. **File 3: gw-offense.tsx** - Two simple queries
6. **File 2: goals.tsx** - Single simple query with multiple mutations
7. **File 4: lre.tsx** - Two queries with arguments
8. **File 8: roster.tsx** - Conditional query (special case)
9. **File 9: CampaignProgressSync.tsx** - Headless component (most complex)

---

## Key Differences: Old vs New Pattern

| Feature | Old (`convex/react`) | New (`@tanstack/react-query`) |
|---------|---------------------|-------------------------------|
| Import source | `"convex/react"` | `"@tanstack/react-query"` + `"@convex-dev/react-query"` |
| Variable naming | `const data = ...` | `const dataQuery = ...` (postfixed with Query) |
| Destructuring | Destructure return values | **DO NOT destructure - use object directly** |
| Return type | Direct data or `undefined` | Query object with `data`, `isPending`, `isError`, `error` |
| Data access | Direct: `data` | Via object: `dataQuery.data` |
| Loading state | Check `data === undefined` | Check `dataQuery.isPending` |
| Error state | Not available | `dataQuery.error` property available |
| Conditional queries | `"skip"` string | `enabled: boolean` option |
| Multiple queries | Direct variable names (conflict risk) | Query postfix naming (no conflicts) |
| Automatic dependencies | Based on arguments | Based on query key (automatic) |
| Reactive updates | Via Convex WebSocket | Maintained via `ConvexQueryClient` |

---

## Variable Naming Convention

**Why postfix with `Query`?**
- Prevents naming conflicts when multiple related queries are added
- Clear distinction between query objects and data values
- Enables IDE autocomplete for query methods
- Future-proofs the code for easier refactoring
- Makes it obvious that you're accessing an object, not a value directly

**Examples:**
```typescript
// Single query - NO DESTRUCTURING
const goalsQuery = useQuery(convexQuery(api.goals.list));
console.log(goalsQuery.data);
console.log(goalsQuery.isPending);
console.log(goalsQuery.error);

// Multiple queries (no conflicts)
const docQuery = useQuery(convexQuery(api.gwOffense.get));
const teamsQuery = useQuery(convexQuery(api.teams.list));
// Not: const doc = ..., const teams = ... (unclear what they are)

// With arguments
const teamsQuery = useQuery(
  convexQuery(api.lre.listTeams, { eventId: selectedEventId })
);

## Plan Updates Based on Completed Files

### Implementation Quality: Excellent ✅
Both completed files follow the refactoring plan perfectly with no deviations or issues. The developer demonstrates excellent understanding of:
- When to update imports vs. when to leave them unchanged
- The importance of the `Query` suffix for clarity
- Proper data access patterns with the new TanStack Query structure

### Recommended Pattern Confirmations
Based on the successful implementation of files 1-2, here are patterns confirmed as correct:

**Pattern 1: Mixed Imports (for files with mutations)**
```typescript
import { useMutation } from "convex/react";           // STAYS
import { useQuery } from "@tanstack/react-query";     // MOVED
import { convexQuery } from "@convex-dev/react-query"; // ADDED
```
✅ Used correctly in `goals.tsx` - keep this pattern for files 3-9.

**Pattern 2: Query Declaration**
```typescript
const goalsQuery = useQuery(convexQuery(api.goals.list));
```
✅ Variable always suffixed with `Query` for clarity
✅ No destructuring - always use object accessor pattern
✅ Verified in both completed files

**Pattern 3: Data Access**
```typescript
// Access data
if (goalsQuery.data) { /* ... */ }
goalsQuery.data?.map(/* ... */)

// Check loading state
if (goalsQuery.isPending) { /* show spinner */ }

// Access error if needed
if (goalsQuery.error) { /* handle error */ }
```
✅ Applied consistently in `campaign-progression.tsx`
✅ Applied throughout `goals.tsx` component logic

### Remaining Files (3-9) - Priority Order

Based on complexity assessment from plan, execute in this order:

1. **File 3: gw-offense.tsx** (Medium complexity - 2 queries)
2. **File 5: roster-snapshots.tsx** (Low complexity - 1 query, 1 mutation)
3. **File 6: teams.tsx** (Low complexity - 1 query, 1 mutation)
4. **File 7: index.tsx** (Low complexity - 1 query)
5. **File 4: lre.tsx** (High complexity - 2 queries with arguments, conditional)
6. **File 8: roster.tsx** (High complexity - 1 query with enabled flag)
7. **File 9: CampaignProgressSync.tsx** (Medium complexity - check for edge cases)

### Quality Gates for Remaining Files

Before marking each file complete, verify:
- [ ] Import statements follow the mixed import pattern (mutations stay, queries move)
- [ ] All query variables end with `Query` suffix
- [ ] No destructuring of query result objects
- [ ] All data accesses use `.data` property accessor
- [ ] Loading states check `.isPending` (not truthy on query object itself)
- [ ] Mutations remain completely unchanged from original
- [ ] All effect dependencies updated if referencing query objects
- [ ] No logic changes - only pattern refactoring

### Next Session Checklist

- [ ] Review this completion summary with team
- [ ] Confirm remaining file execution order
- [ ] Begin File 3 (gw-offense.tsx) when ready
- [ ] Run full test suite after each file completion
- [ ] Verify no runtime errors in TanStack Query integration

// Conditional query
const dataQuery = useQuery({
  ...convexQuery(api.roster.getShared, { token }),
  enabled: !!token,
});

// Accessing data
if (dataQuery.isPending) return <Loader />;
const teams = dataQuery.data?.map(t => ...);
```

---

## Notes for Implementation

1. **Backwards compatible:** The Convex backend functions don't change - only the frontend hook changes
2. **Type safety:** TypeScript will automatically understand the new query structure
3. **Reactive updates:** The `ConvexQueryClient` maintains WebSocket subscriptions automatically
4. **No manual invalidation:** Unlike REST APIs with TanStack Query, Convex pushes updates automatically
5. **Mutations:** The `useMutation` from `convex/react` stays the same - only refactoring `useQuery`
6. **Error handling:** The new pattern provides `.error` which wasn't available in the old pattern
7. **Find and Replace:** You can use your editor's find-and-replace feature to speed up refactoring:
   - Find: `const (\w+) = useQuery\(api\.`
   - Replace: `const $1Query = useQuery(convexQuery(api.`
   - Then manually fix any edge cases
8. **NO DESTRUCTURING:** Do not destructure the query object. Always use `queryNameQuery.data`, `queryNameQuery.isPending`, etc.