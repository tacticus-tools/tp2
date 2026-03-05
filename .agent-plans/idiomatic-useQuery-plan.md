# Agent Plan: Refactor Idiomatic useQuery Patterns

**Created:** 2026-03-05  
**Status:** Not Started  
**Last Updated:** 2026-03-05

## High-Level Goal

Modernize `useQuery` hooks to follow idiomatic TanStack Query v5 patterns with consistent error handling, loading states, and optional automatic refetching to improve data freshness and user experience.

## Success Criteria

- [ ] All queries use `useQuery` from `@tanstack/react-query` with `useConvexQuery` wrapper
- [ ] Query variables named with `Query` postfix (e.g., `goalsQuery`, not destructured)
- [ ] All components properly handle `query.isPending`, `query.error`, `query.data`
- [ ] Error states display user-friendly messages with optional retry button
- [ ] Stale time and refetch settings appropriate for Convex real-time data
- [ ] No manual loading/error state variables (use query state directly)
- [ ] TypeScript compilation passes
- [ ] No lint errors
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git

## Implementation Plan

### Step 1: Audit Current Query Usage

**Goal:** Identify all components using queries and categorize by complexity

**Reasoning:** Understanding the scope helps prioritize refactoring order.

**Substeps:**
1. [ ] Grep codebase for all `useQuery` calls
2. [ ] Document component name, API endpoint, and parameters
3. [ ] Categorize by type:
   - Simple queries (no arguments, no dependencies)
   - Parameterized queries (with arguments)
   - Dependent queries (enabled based on other state)
   - Conditional queries (skip/enabled pattern)
4. [ ] Note any existing manual loading/error state

**Success Indicator:**
- [ ] Comprehensive list of all queries documented
- [ ] Complexity assessment for each query
- [ ] Dependencies between queries understood

**Commit:** N/A (documentation only)

**Progress:** ⬜ Not started

---

### Step 2: Refactor Simple Queries

**Goal:** Update straightforward queries without arguments or dependencies

**Reasoning:** Simple queries have no edge cases; completing them first validates the pattern.

**Substeps:**
1. Update import statements:
   - Add `import { useQuery } from "@tanstack/react-query"`
   - Add `import { useConvexQuery } from "@convex-dev/react-query"`
2. Refactor query declarations:
   - Change `const data = useQuery(api.endpoint)` to `const dataQuery = useQuery(useConvexQuery(api.endpoint))`
3. Update all data accesses:
   - Replace `data` → `dataQuery.data`
   - Replace `if (!data)` → `if (dataQuery.isPending)`
4. Remove manual loading state if any
5. Test component renders correctly with query data

**Success Indicator:**
- [ ] All simple queries follow the new pattern
- [ ] Data loads and displays correctly
- [ ] Loading spinner shows while fetching
- [ ] No console TypeScript warnings
- [ ] No lint errors

**Commit:** `git commit -m 'refactor: modernize simple queries to TanStack Query v5'`

**Progress:** ⬜ Not started

---

### Step 3: Refactor Parameterized & Dependent Queries

**Goal:** Update queries with arguments and conditional execution

**Reasoning:** These queries are more complex and need careful handling of the `enabled` option.

**Substeps:**
1. For parameterized queries:
   - Wrap arguments with `useConvexQuery(api.endpoint, { arg1, arg2 })`
   - Update data access to use `query.data`
2. For dependent queries:
   - Use `enabled: !!parentData` option
   - Only execute query when dependencies are available
   - Test that parent query completes before dependent query runs
3. Remove `"skip"` pattern if present; use `enabled` instead
4. Update UI to handle loading states at each level

**Success Indicator:**
- [ ] Parameterized queries execute with correct arguments
- [ ] Dependent queries only run when appropriate
- [ ] No undefined data errors
- [ ] Query chain loads correctly
- [ ] No console errors

**Commit:** `git commit -m 'refactor: modernize parameterized and dependent queries'`

**Progress:** ⬜ Not started

---

### Step 4: Add Error Handling & UI

**Goal:** Display error states with retry capability

**Reasoning:** Users should see errors and be able to retry without reloading the page.

**Substeps:**
1. Add error display UI:
   - Show error message when `query.isError` is true
   - Display `query.error?.message` or a user-friendly message
2. Add retry button:
   - Call `query.refetch()` when user clicks retry
   - Disable button during refetch
3. Test error scenarios:
   - Simulate network failure
   - Trigger Convex function errors
   - Verify retry works
4. Ensure error doesn't block other page functionality

**Success Indicator:**
- [ ] Error messages display correctly
- [ ] Retry button works and re-executes query
- [ ] Error state clears on successful retry
- [ ] Page remains usable despite query error
- [ ] No console errors

**Commit:** `git commit -m 'refactor: add error handling and retry to queries'`

**Progress:** ⬜ Not started

---

### Step 5: Optimize & Test

**Goal:** Configure stale/cache times and run comprehensive tests

**Reasoning:** Optimization ensures good UX and performance; testing validates all changes work together.

**Substeps:**
1. Configure stale time for queries:
   - Real-time data (from Convex): 0ms (use mutations to trigger updates)
   - Less frequent data: consider 30-60 seconds
2. Configure cache time appropriately (default is usually fine)
3. Run `bun run dev` and test all pages with queries
4. Verify:
   - Data loads correctly
   - Real-time updates work (Convex WebSocket syncing)
   - Error states display properly
   - No unnecessary refetches
5. Run `bun run build-ci` for final validation

**Success Indicator:**
- [ ] All queries have appropriate stale/cache times
- [ ] Real-time updates work
- [ ] No excessive refetches
- [ ] Build passes
- [ ] All tests pass
- [ ] No TypeScript or lint errors

**Commit:** `git commit -m 'refactor: optimize query configuration and complete modernization'`

**Progress:** ⬜ Not started

---

## Notes & Decisions

- **Query naming convention**: Always postfix with `Query` (e.g., `goalsQuery`, `docQuery`) to avoid conflicts with data variables
- **Never destructure**: Access query state via the object directly (`goalsQuery.data`, `goalsQuery.isPending`, etc.)
- **Convex syncing**: WebSockets handle real-time updates; no manual invalidation needed
- **Stale time**: For Convex real-time data, use `staleTime: 0` to treat data as always stale and rely on subscriptions
- **Error handling**: Provide user-friendly messages, not raw error objects

## References

- [TanStack Query v5 Documentation](https://tanstack.com/query/v5/docs)
- [useQuery API Reference](https://tanstack.com/query/v5/docs/reference/useQuery)
- [Convex TanStack Query Integration](https://docs.convex.dev/client/tanstack/tanstack-query/)
- [Query Options Configuration](https://tanstack.com/query/v5/docs/reference/useQuery#options)

---

**Status Summary:** Ready to start. This plan covers comprehensive query modernization. Start with Step 1 (audit) to understand the full scope, then proceed with simple queries (Step 2) before tackling complex ones (Steps 3-4). Testing (Step 5) should follow each step.