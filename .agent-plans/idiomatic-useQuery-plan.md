# TanStack Query useQuery Refactoring Plan

## Overview

This document provides file-by-file refactoring instructions for modernizing `useQuery` usage to idiomatic TanStack Query v5 patterns. The current codebase uses basic query definitions without leveraging built-in state properties or error handling callbacks.

Unlike mutations, queries are primarily for fetching data and handling loading/error states. The refactoring focuses on:
1. Using query state properties correctly (`isLoading`, `isError`, `error`, `data`)
2. Adding error handling through query callbacks
3. Standardizing error presentation
4. Improving conditional rendering patterns

Since Convex syncs data via WebSockets, queries will automatically refetch and update when subscriptions change. Error callbacks centralize error handling.

> STATUS: Plan created. Ready to begin implementation.

## Key Improvements

1. **Leverage Query State Properties**
   - Use `query.isLoading` for initial load state
   - Use `query.isError` for error detection
   - Use `query.error` for error messages
   - Use `query.data` for actual data (properly guarded)

2. **Add Error Handling**
   - Add `onError` callback to log errors
   - Display user-friendly error messages in UI
   - Avoid silent failures

3. **Standardize Loading & Error UI**
   - Consistent loading spinner across all pages
   - Consistent error alert UI component
   - Clear messaging for empty states vs. error states

4. **Remove Anti-patterns**
   - No duplicate loading state variables (use `query.isLoading`)
   - No try/catch around `useQuery` initialization
   - Proper null-safety when accessing `query.data`

## Pattern Summary

Every refactored query should follow this structure:

```tsx
const myQuery = useQuery({
  ...convexQuery(api.resource.list),
  onError: (error) => {
    // Log error, optionally show toast for critical queries
    console.error("Failed to fetch resource:", error);
    // Optionally show toast for user-facing queries:
    // toast.error(error instanceof Error ? error.message : "Failed to load");
  },
});

// UI rendering becomes predictable:
if (myQuery.isLoading) {
  return <LoadingSpinner />;
}

if (myQuery.isError) {
  return <ErrorAlert error={myQuery.error} />;
}

// At this point, data is guaranteed to exist
const items = myQuery.data ?? [];
```

---

## Files to Refactor (9 total, in priority order)

---

## Priority 1: Simple Single-Query Pages

### 1. `src/0-routes/_authenticated/settings.tsx`

**Current State:**
- 1 query: `credentialsQuery`
- Uses `isLoading` and `isError` correctly
- Has error handling in UI but no callback

**Changes to Apply:**

1. Add `onError` callback to `credentialsQuery`:
   ```tsx
   const credentialsQuery = useQuery({
     ...convexQuery(api.tacticus.credentials.get),
     onError: (error) => {
       console.error("Failed to load credentials:", error);
     },
   });
   ```

2. Verify error display is clean:
   - Current error handling shows message in UI ✓
   - Consider adding toast if error is critical

3. Verify loading state display ✓
   - Uses `credentialsQuery.isLoading` correctly

**Testing:**
- Load page with valid user
- Verify credentials display
- Test error scenario (network offline) to verify error UI
- Verify no TypeScript errors

---

### 2. `src/0-routes/_authenticated/teams.tsx`

**Current State:**
- 1 query: `teamsQuery`
- Uses conditional rendering with `teamsQuery.data`
- Filtering logic depends on `teamsQuery.data`

**Changes to Apply:**

1. Add `onError` callback:
   ```tsx
   const teamsQuery = useQuery({
     ...convexQuery(api.teams.list),
     onError: (error) => {
       console.error("Failed to load teams:", error);
     },
   });
   ```

2. Improve loading state:
   - Add loading UI before rendering team cards
   - Current code uses data safely with `teamsQuery.data ?? []` ✓

3. Add error state:
   ```tsx
   if (teamsQuery.isError) {
     return (
       <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
         <p className="text-sm text-destructive">
           Failed to load teams. Please try again.
         </p>
       </div>
     );
   }
   ```

4. Wrap content with loading check:
   ```tsx
   if (teamsQuery.isLoading) {
     return (
       <div className="flex items-center justify-center py-20">
         <Loader2 className="size-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
   ```

**Testing:**
- Add/edit/remove teams
- Verify operations work with query data
- Test loading and error states
- Verify no TypeScript errors

---

### 3. `src/0-routes/_authenticated/roster-snapshots.tsx`

**Current State:**
- 1 query: `docQuery`
- Loading/error state usage unknown

**Changes to Apply:**

1. Read file and assess current state
2. Add `onError` callback
3. Add loading/error UI if missing
4. Ensure proper null-safety when accessing `docQuery.data`

---

### 4. `src/0-routes/_authenticated/gw-offense.tsx`

**Current State:**
- 2 queries: `docQuery`, `teamsQuery`
- Multiple mutations that update related data

**Changes to Apply:**

1. For each query, add `onError` callback
2. Verify loading/error states handled
3. Ensure mutations don't duplicate state that queries provide

---

## Priority 2: Complex Multi-Query Pages

### 5. `src/0-routes/_authenticated/goals.tsx`

**Current State:**
- 1 query: `goalsQuery`
- Uses `goalsQuery.data` extensively for filtering and rendering
- Loading state check: `goalsQuery.isLoading || !hasHydrated || !initialSyncDone`
- Error handling: none visible

**Changes to Apply:**

1. Add `onError` callback:
   ```tsx
   const goalsQuery = useQuery({
     ...convexQuery(api.goals.list),
     onError: (error) => {
       console.error("Failed to load goals:", error);
       // Goals page is critical, consider toast:
       // toast.error("Failed to load goals");
     },
   });
   ```

2. Add explicit error state handling:
   ```tsx
   if (goalsQuery.isError) {
     return (
       <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 py-16">
         <AlertTriangle className="mb-4 size-8 text-destructive" />
         <h3 className="mb-2 text-lg font-medium">Failed to Load Goals</h3>
         <p className="mb-4 text-sm text-muted-foreground">
           {goalsQuery.error instanceof Error
             ? goalsQuery.error.message
             : "An error occurred while loading goals"}
         </p>
         <Button onClick={() => goalsQuery.refetch()}>Retry</Button>
       </div>
     );
   }
   ```

3. Note: Keep existing loading state logic as-is since it coordinates multiple async sources (`goalsQuery.isLoading`, `hasHydrated`, `initialSyncDone`)

**Testing:**
- Load page and verify goals display
- Test refetch on error
- Verify no TypeScript errors
- Test with network offline

---

### 6. `src/0-routes/_authenticated/campaign-progression.tsx`

**Current State:**
- 1 query: `goalsQuery`
- Similar usage to goals.tsx

**Changes to Apply:**

1. Add `onError` callback
2. Add error state UI
3. Follow same pattern as goals.tsx

---

## Priority 3: Components with Queries

### 7. `src/1-components/CampaignProgressSync.tsx`

**Current State:**
- 1 query: `campaignProgressQuery`
- Used to initialize/sync data
- Part of sync logic with mutations

**Changes to Apply:**

1. Add `onError` callback:
   ```tsx
   const campaignProgressQuery = useQuery({
     ...convexQuery(api.campaignProgress.get),
     onError: (error) => {
       console.error("Failed to sync campaign progress:", error);
     },
     retry: 2, // Retry transient failures
   });
   ```

2. Verify sync logic handles error state gracefully
3. Consider showing subtle error indicator if sync fails

**Testing:**
- Trigger campaign progress sync
- Verify data loads correctly
- Test with network issues to verify retry behavior

---

### 8. `src/1-components/goals/GoalDialog.tsx` (if has queries)

**Current State:**
- Unknown - needs inspection

**Changes to Apply:**

1. Read file to assess queries
2. Add `onError` callback if queries exist
3. Verify error states handled in dialog

---

### 9. `src/0-routes/index.tsx`

**Current State:**
- 1 query: `credentialsQuery`
- Public/landing page route

**Changes to Apply:**

1. Add `onError` callback
2. Verify loading/error UI appropriate for landing page
3. May need different error message (more user-friendly)

---

## General Testing Checklist

After completing each file:

- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Loading spinner appears while query is pending
- [ ] Error message displays when query fails
- [ ] Data displays correctly when query succeeds
- [ ] No console warnings about missing dependencies
- [ ] `onError` callback is properly defined
- [ ] Query data is safely accessed (with nullish coalescing or guard clauses)
- [ ] Test with network tab open to verify requests
- [ ] Test with slow network to verify loading states
- [ ] Test refetch button (if provided) works correctly

---

## Error Handling Best Practices

### Standard Error Messages

```tsx
// Generic user-friendly message
const userMessage = error instanceof Error 
  ? error.message 
  : "Failed to load data";

// Log full error for debugging
console.error("Query error:", error);

// Show toast for critical operations
toast.error(userMessage);
```

### When to Show Toast vs. UI Alert

**Show toast (non-blocking):**
- Loading goals on goals page (data will auto-refetch)
- Non-critical data fetch that has fallback UI

**Show UI alert (blocking):**
- Critical data required to render page (settings, roster)
- Data load failure that prevents user from taking action
- Error state needs explicit retry button

---

## Query Dependencies & Side Effects

### Queries with Auto-Refetch
Since Convex uses WebSocket subscriptions, queries automatically refetch when underlying data changes. No need for manual cache invalidation in mutation callbacks.

### Query Results from Mutations
When mutations modify data that queries depend on:
1. Don't manually invalidate — Convex handles it
2. Optionally use `onMutate` for optimistic updates
3. Mutation success doesn't need to refetch manually

Example:
```tsx
// Mutation updates goals
const updateGoalMutation = useMutation({
  mutationFn: useConvexMutation(api.goals.update),
  onSuccess: () => {
    // Don't refetch goalsQuery — Convex subscription updates it
    toast.success("Goal updated");
  },
  onError: (error) => {
    toast.error("Failed to update goal");
  },
});

// goalsQuery will automatically reflect changes via subscription
```

---

## Common Patterns in This Codebase

### Pattern 1: Query with Filtering/Sorting
```tsx
const query = useQuery(convexQuery(api.items.list));

// Safe filtering
const filtered = query.data?.filter(item => condition) ?? [];
```

### Pattern 2: Query with Multiple Dependencies
```tsx
const goalsQuery = useQuery(convexQuery(api.goals.list));

// Combine query loading with other async state
const isLoading = goalsQuery.isLoading || !hydrated || !syncDone;

if (isLoading) return <Spinner />;
if (goalsQuery.isError) return <Error />;
```

### Pattern 3: Optional Query Data with Fallback
```tsx
const credentialsQuery = useQuery(convexQuery(api.credentials.get));

// Safe access with fallback
const credentials = credentialsQuery.data ?? {
  playerApiKey: "",
  guildApiKey: "",
};
```

---

## Implementation Order

1. Start with Priority 1 (simple pages) to establish patterns
2. Move to Priority 2 (complex pages) with more error handling
3. Handle Priority 3 (components) last

After each file, run:
```bash
bun run check  # TypeScript + lint check
```

---

## Notes & Rationale

- `useQuery` is for fetching data; errors are expected and should be handled gracefully
- Convex's WebSocket subscriptions mean queries update automatically without manual cache manipulation
- Error callbacks should log errors for debugging while UI shows user-friendly messages
- Loading states should be consistent across the app — use a shared loading spinner component
- Query state properties (`isLoading`, `isError`, `data`) should be the single source of truth for UI

---

## Next Steps

When ready to begin implementation:
1. Start with `src/0-routes/_authenticated/settings.tsx`
2. Review current implementation
3. Add `onError` callback
4. Verify error display
5. Run tests
6. Move to next file

Report progress and any blockers as you proceed through the refactoring.