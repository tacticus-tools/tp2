# Agent Plan: Refactor Idiomatic useMutation Patterns

**Created:** 2026-03-05  
**Status:** In Progress  
**Last Updated:** 2026-03-05

## High-Level Goal

Enhance mutation error handling and user feedback by standardizing on `onSuccess` and `onError` callbacks across all mutations, removing manual state management for loading/error states, and providing consistent toast notifications and UI feedback patterns.

## Success Criteria

- [ ] All mutations include `onSuccess` callback with appropriate side effects (toast, dialog close, etc.)
- [ ] All mutations include `onError` callback with user-friendly error toasts
- [ ] Manual loading state variables (`saving`, `importing`, etc.) removed where mutations provide `isPending`
- [ ] Manual error state variables removed in favor of `mutation.isError` and `mutation.error`
- [ ] Button disabled states use `mutation.isPending` directly
- [ ] No try/catch wrappers around `mutateAsync()` calls (use `onError` callback instead)
- [ ] All dialogs close on mutation success (via `onSuccess` callback)
- [ ] All form resets handled in `onSuccess` or `onError` appropriately
- [ ] TypeScript compilation passes
- [ ] No lint errors
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git with clear messages

## Implementation Plan

### Step 1: Add Error Callbacks to Simple Mutations

**Goal:** Enhance mutations in settings and basic mutation files with `onError` callbacks

**Reasoning:** Error handling is foundational; implementing it on simple mutations first validates the pattern.

**Substeps:**
1. [ ] Identify mutations without `onError` callbacks
2. [ ] Add `onError: (error) => { toast.error(...) }` callback
3. [ ] Use `error instanceof Error ? error.message : "Action failed"` pattern
4. [ ] Test error scenarios (network failure, validation error)
5. [ ] Verify error toast displays

**Success Indicator:**
- [x] File 1: `src/0-routes/_authenticated/settings.tsx` — `onSuccess` and `onError` callbacks added
- [x] File 2: `src/0-routes/_authenticated/roster.tsx` — `onSuccess` and `onError` callbacks added
- [x] File 3: `src/0-routes/_authenticated/gw-offense.tsx` — `onSuccess` and `onError` callbacks added
- [x] File 4: `src/0-routes/_authenticated/roster-snapshots.tsx` — ready for callbacks
- [ ] All error toasts display correctly
- [ ] No console TypeScript warnings

**Commit:** `git commit -m 'refactor: add error handling callbacks to core mutations'`

**Progress:** 🟦 In progress (3 of 4 files completed with callbacks)

---

### Step 2: Remove Manual Loading State from Dialogs

**Goal:** Eliminate `useState` for loading states in goal dialogs, use `mutation.isPending` directly

**Reasoning:** Dialogs already use mutations; leveraging mutation state reduces component complexity.

**Substeps:**
1. [ ] File: `src/1-components/goals/AddGoalDialog.tsx`
   - Remove `const [saving, setSaving] = useState(false)`
   - Update `isSaveDisabled` to use `addGoal.isPending`
   - Update button text and spinner to use `addGoal.isPending`
   - Remove `setSaving()` calls from handler
2. [ ] File: `src/1-components/goals/EditGoalDialog.tsx`
   - Remove `const [saving, setSaving] = useState(false)`
   - Update `isSaveDisabled` to use `updateGoal.isPending`
   - Update button to use `updateGoal.isPending`
   - Remove `setSaving()` calls from handler
3. [ ] Add `onSuccess` callback to close dialog
4. [ ] Add `onError` callback to show error message
5. [ ] Test form submission with loading state

**Success Indicator:**
- [ ] Both dialog files have no `saving` state
- [ ] Button disabled state reflects `mutation.isPending`
- [ ] Save button shows spinner during request
- [ ] Dialog closes on success
- [ ] Error message displays on failure
- [ ] No manual state management

**Commit:** `git commit -m 'refactor: remove manual loading state from goal dialogs'`

**Progress:** ⬜ Not started

---

### Step 3: Standardize Mutation Callbacks Across Pages

**Goal:** Add consistent `onSuccess`/`onError` callbacks to all mutations in multi-mutation pages

**Reasoning:** Pages with multiple mutations need consistent error handling and feedback patterns.

**Substeps:**
1. [ ] File: `src/0-routes/_authenticated/teams.tsx` (3 mutations)
   - Add `onSuccess` and `onError` to `addTeam`, `updateTeam`, `removeTeam`
   - Show appropriate toasts (e.g., "Team added successfully")
   - Close dialogs on success
2. [ ] File: `src/0-routes/_authenticated/goals.tsx` (4 mutations)
   - Add `onSuccess` and `onError` to all mutations
   - Consider optimistic updates where appropriate
   - Ensure UI updates correctly after mutation
3. [ ] File: `src/0-routes/_authenticated/lre.tsx` (4 mutations)
   - Add callbacks to all LRE mutations
   - Provide clear feedback for save, add, update, remove operations
4. [ ] File: `src/1-components/ImportButton.tsx`
   - Add `onSuccess` callback with import summary
   - Add `onError` callback for parse/upload failures
5. [ ] File: `src/1-components/CampaignProgressSync.tsx`
   - Add `onSuccess` callback for sync feedback
   - Add `onError` with retry logic
6. [ ] Test each mutation independently
7. [ ] Verify all callbacks execute correctly

**Success Indicator:**
- [ ] All mutations have consistent callback patterns
- [ ] Success toasts display with appropriate messages
- [ ] Error toasts display with user-friendly messages
- [ ] Dialogs close on successful mutations
- [ ] Forms reset after successful submission
- [ ] No console warnings
- [ ] TypeScript compilation succeeds

**Commit:** Multiple commits, one per file:
- `git commit -m 'refactor: add mutation callbacks to teams.tsx'`
- `git commit -m 'refactor: add mutation callbacks to goals.tsx'`
- `git commit -m 'refactor: add mutation callbacks to lre.tsx'`
- `git commit -m 'refactor: add mutation callbacks to ImportButton.tsx'`
- `git commit -m 'refactor: add mutation callbacks to CampaignProgressSync.tsx'`

**Progress:** ⬜ Not started

---

### Step 4: Remove Manual State Management

**Goal:** Eliminate redundant manual error/loading states throughout the codebase

**Reasoning:** Once mutations have callbacks, manual state becomes redundant and source of bugs.

**Substeps:**
1. [ ] Search for patterns: `const [loading, setLoading]`, `const [error, setError]`
2. [ ] For each, verify the mutation provides equivalent state
3. [ ] Remove the manual state variable
4. [ ] Update UI to use `mutation.isPending`, `mutation.isError`, `mutation.error`
5. [ ] Ensure no breaking changes to component behavior
6. [ ] Test form submissions and error scenarios

**Success Indicator:**
- [ ] All redundant loading state removed
- [ ] All redundant error state removed
- [ ] UI still displays loading/error correctly
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] All tests pass

**Commit:** `git commit -m 'refactor: remove redundant manual state management from mutations'`

**Progress:** ⬜ Not started

---

### Step 5: Final Testing & Optimization

**Goal:** Comprehensive testing and final validation of all mutation changes

**Reasoning:** Testing ensures all changes work correctly together without regressions.

**Substeps:**
1. [ ] Run `bun run dev` and navigate through all pages with mutations
2. [ ] Test each mutation type:
   - [ ] Form submissions (add, edit, save)
   - [ ] Deletions with confirmation
   - [ ] Imports with file parsing
   - [ ] Bulk operations
3. [ ] Test error scenarios:
   - [ ] Simulate network failures
   - [ ] Trigger validation errors
   - [ ] Test error retry flows
4. [ ] Verify toast notifications:
   - [ ] Success messages appear and auto-dismiss
   - [ ] Error messages appear with retry option if applicable
5. [ ] Check UI state consistency:
   - [ ] Buttons disabled during pending
   - [ ] Spinners show during loading
   - [ ] Dialogs close after success
6. [ ] Run `bun run build-ci` for final validation

**Success Indicator:**
- [ ] All mutations execute correctly
- [ ] All toast notifications appear
- [ ] No manual state inconsistencies
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] All tests pass
- [ ] No accessibility issues

**Commit:** `git commit -m 'refactor: finalize mutation callback standardization'`

**Progress:** ⬜ Not started

---

## Pattern Example

Here's the standard pattern all mutations should follow:

```typescript
const saveMutation = useMutation({
  mutationFn: useConvexMutation(api.resource.save),
  onSuccess: () => {
    toast.success("Changes saved successfully");
    // Close dialogs, reset forms, update local state as needed
  },
  onError: (error) => {
    toast.error(
      error instanceof Error ? error.message : "Failed to save changes"
    );
    // No manual error state management needed
  },
});

// Handler remains simple:
async function handleSave(data: Data) {
  saveMutation.mutateAsync(data);
  // No try/catch needed - errors handled in onError callback
}

// UI uses mutation state directly:
<button
  disabled={saveMutation.isPending}
  onClick={() => handleSave(formData)}
>
  {saveMutation.isPending ? (
    <>
      <Spinner className="mr-2" />
      Saving...
    </>
  ) : (
    "Save"
  )}
</button>
```

## Notes & Decisions

- **No try/catch around mutateAsync()**: Errors are handled in `onError` callback instead
- **Consistent toast messages**: Success toasts show what was accomplished, error toasts show why it failed
- **Dialog management**: `onSuccess` closes dialogs automatically
- **Form reset**: Reset forms in `onSuccess` callback to ensure success before clearing
- **Loading state**: Use `mutation.isPending` directly in UI, no separate state variable
- **Error display**: Show errors via toast + optional inline message, not just console

## Files to Refactor

1. ✅ `src/0-routes/_authenticated/settings.tsx` — Callbacks added
2. ✅ `src/0-routes/_authenticated/roster.tsx` — Callbacks added
3. ✅ `src/0-routes/_authenticated/gw-offense.tsx` — Callbacks added
4. [ ] `src/0-routes/_authenticated/roster-snapshots.tsx`
5. [ ] `src/0-routes/_authenticated/teams.tsx`
6. [ ] `src/0-routes/_authenticated/goals.tsx`
7. [ ] `src/0-routes/_authenticated/lre.tsx`
8. [ ] `src/1-components/ImportButton.tsx`
9. [ ] `src/1-components/CampaignProgressSync.tsx`
10. [ ] `src/1-components/goals/AddGoalDialog.tsx`
11. [ ] `src/1-components/goals/EditGoalDialog.tsx`

## References

- [TanStack Query Mutation Callbacks](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects)
- [onSuccess API](https://tanstack.com/query/v5/docs/reference/useMutation#onsuccess)
- [onError API](https://tanstack.com/query/v5/docs/reference/useMutation#onerror)
- [Convex Mutations with TanStack](https://docs.convex.dev/client/tanstack/tanstack-query/)

---

**Status Summary:** In progress. Three files (settings, roster, gw-offense) have been enhanced with callback patterns. Next steps involve removing manual loading state from dialogs and standardizing callbacks across multi-mutation pages.