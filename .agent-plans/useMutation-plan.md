# Agent Plan: Refactor useMutation from convex/react → @convex-dev/react-query

**Created:** 2026-03-05  
**Status:** ✅ Complete  
**Last Updated:** 2026-03-05

## High-Level Goal

Migrate all direct `useMutation` imports from `convex/react` to use TanStack Query v5 with `@convex-dev/react-query` as the standard mutation pattern across the codebase.

## Success Criteria

- [x] All 11 files refactored to use `useMutation({ mutationFn: useConvexMutation(...) })`
- [x] Import statements updated (removed `convex/react`, added `@tanstack/react-query` and `@convex-dev/react-query`)
- [x] All mutation invocations updated (`.mutate()` for fire-and-forget, `.mutateAsync()` for async/await)
- [x] Mutation state accessed via full object (e.g., `mutation.isPending`), not destructured
- [x] All 18 total mutations refactored across the codebase
- [x] `bun run build-ci` passes
- [x] Changes committed to git

## Implementation Plan

### Step 1: Refactor Core Authentication & Data Mutations

**Goal:** Migrate mutations in settings and credentials-related files to establish the pattern

**Reasoning:** These are foundational mutations with minimal dependencies; establishing the pattern here ensures consistency for more complex files.

**Substeps:**
1. Update `src/0-routes/_authenticated/settings.tsx` - convert `saveMutation`
2. Update `src/0-routes/_authenticated/roster.tsx` - convert `shareRoster`
3. Update `src/0-routes/_authenticated/roster-snapshots.tsx` - convert `save`
4. Update `src/0-routes/_authenticated/gw-offense.tsx` - convert `saveGw`

**Success Indicator:**
- [x] Each file uses the new TanStack Query pattern
- [x] `useMutation({ mutationFn: useConvexMutation(...) })` structure
- [x] Mutation calls use `.mutateAsync()` for await patterns
- [x] No remaining `convex/react` imports for mutations
- [x] TypeScript compilation succeeds

**Commit:** `git commit -m 'refactor: migrate core mutations to @convex-dev/react-query'`

**Progress:** ✅ Complete

---

### Step 2: Refactor Component-Level Mutations

**Goal:** Update mutations in reusable components (dialogs, buttons, sync)

**Reasoning:** Components are used throughout the app; establishing the pattern here prevents cascade refactoring needs elsewhere.

**Substeps:**
1. Update `src/1-components/ImportButton.tsx` - convert `importAll`
2. Update `src/1-components/CampaignProgressSync.tsx` - convert `saveMutation`
3. Update `src/1-components/goals/AddGoalDialog.tsx` - convert `addGoal`
4. Update `src/1-components/goals/EditGoalDialog.tsx` - convert `updateGoal`

**Success Indicator:**
- [x] All component mutations follow the new pattern
- [x] File input and dialog components work correctly
- [x] Async operations properly await `mutateAsync()`
- [x] No state access issues with mutation properties
- [x] TypeScript compilation succeeds

**Commit:** `git commit -m 'refactor: migrate component mutations to @convex-dev/react-query'`

**Progress:** ✅ Complete

---

### Step 3: Refactor Multi-Mutation Pages

**Goal:** Update pages with multiple mutations (teams, goals, LRE events)

**Reasoning:** These files have more complex interaction patterns; completing them last ensures we've validated the pattern on simpler cases first.

**Substeps:**
1. Update `src/0-routes/_authenticated/teams.tsx` - convert 3 mutations
2. Update `src/0-routes/_authenticated/goals.tsx` - convert 4 mutations
3. Update `src/0-routes/_authenticated/lre.tsx` - convert 4 mutations

**Success Indicator:**
- [x] All mutations in each file follow the new pattern
- [x] Multiple mutation interactions work correctly (add/update/remove)
- [x] Dialog open/close flows unaffected
- [x] State access via mutation object works for all cases
- [x] TypeScript compilation succeeds
- [x] `bun run build-ci` passes

**Commit:** `git commit -m 'refactor: migrate multi-mutation pages to @convex-dev/react-query'`

**Progress:** ✅ Complete

---

## Notes & Decisions

- **Pattern Consistency**: All mutations now use the same wrapper pattern: `useMutation({ mutationFn: useConvexMutation(api.resource.action) })`
- **State Access**: Never destructure mutation state. Always access via the mutation variable (e.g., `mutation.isPending`, `mutation.isError`, `mutation.error`)
- **Async Handling**: Use `.mutateAsync()` when awaiting mutation results, `.mutate()` for fire-and-forget patterns
- **No Destructuring**: Even though `useMutation` returns an object with multiple properties, don't destructure in component scopes to keep mutation identity clear
- **Convex Syncing**: No manual query invalidation needed since Convex syncs via WebSockets; focus on side effects in callbacks
- **18 Total Mutations Refactored**: Across 11 files covering authentication, goals, teams, LRE events, imports, and campaign progress

## References

- [Convex + TanStack Query Integration](https://docs.convex.dev/client/tanstack/tanstack-query/)
- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [@convex-dev/react-query Documentation](https://www.npmjs.com/package/@convex-dev/react-query)

---

**Status Summary:** This refactoring has been completed. All 18 mutations across 11 files have been migrated to the TanStack Query v5 pattern with `@convex-dev/react-query`. The codebase now uses a consistent, idiomatic pattern for all Convex mutations.