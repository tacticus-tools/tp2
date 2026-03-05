# TanStack Query Mutations Refactoring Plan

## Overview

This document provides file-by-file refactoring instructions for modernizing `useMutation` usage to idiomatic TanStack Query v5 patterns. The current codebase duplicates loading/error state that the hook provides and lacks structured error handling through mutation callbacks.

Since Convex syncs data via WebSockets, there is no need for manual query invalidation or cache manipulation. Simply move error handling to `onError` callbacks and remove manual state management.

> STATUS: Work paused. Files 1-3 have been refactored and marked complete. No further changes will be made in this run.

## Key Improvements

1. **Remove Manual State Duplication**
   - Replace `useState` for `loading`, `saving`, `error` with mutation's built-in states
   - Use `mutation.isPending`, `mutation.isError`, `mutation.error` directly

2. **Centralize Error Handling**
   - Move error logic from `try/catch` blocks to `onError` callback
   - Toast notifications happen in one place per mutation

3. **Simplify Async Patterns**
   - Remove `try/catch/finally` wrapper code around `mutateAsync()`
   - Let mutation lifecycle handle state automatically

4. **Update UI Conditionals**
   - Replace custom loading/error state checks with mutation state properties
   - Disable buttons with `mutation.isPending`

## Files to Refactor (11 total, in priority order)

---

## Priority 1: Simple Single-Mutation Files

### 1. `src/0-routes/_authenticated/settings.tsx` ✅ COMPLETED

**Current State:**
- 1 mutation: `saveMutation`
- Manual state: `[saving, setSaving]`, `[saved, setSaved]`, `[error, setError]`
- Wraps `mutateAsync()` in try/catch/finally

**Changes Applied:**
- ✅ Removed 3 manual state variables (`saving`, `saved`, `error`)
- ✅ Added `onSuccess` callback with toast feedback and field clearing
- ✅ Added `onError` callback with error toast
- ✅ Removed try/catch/finally wrapper from `handleSave`
- ✅ Updated button state to use `saveMutation.isPending`
- ✅ Removed "Saved" state display
- ✅ Removed unused `Check` import
- ✅ No TypeScript or lint errors

1. Remove these state variables:
   ```
   const [saving, setSaving] = useState(false);
   const [saved, setSaved] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

2. Update `saveMutation` definition to add callbacks:
   ```tsx
   const saveMutation = useMutation({
     mutationFn: useConvexMutation(api.tacticus.credentials.save),
     onSuccess: () => {
       toast.success("Credentials saved successfully");
       setSaved(true);
       setTimeout(() => setSaved(false), 3000);
     },
     onError: (error) => {
       toast.error(
         error instanceof Error ? error.message : "Failed to save credentials."
       );
     },
   });
   ```

3. Replace `handleSave` function:
   - Remove the entire `try/catch/finally` block
   - Remove `setSaving(true)` and `setSaving(false)`
   - Remove `setError(null)` and `setError(...)`
   - Keep the form validation logic
   - Call `saveMutation.mutateAsync()` without wrapping in try/catch
   ```tsx
   async function handleSave(e: React.FormEvent) {
     e.preventDefault();

     if (!credentialsQuery.data && !playerApiKey.trim()) {
       // Show validation error via toast instead
       toast.error("Player API key is required.");
       return;
     }

     saveMutation.mutateAsync({
       tacticusUserId: tacticusUserId.trim() || undefined,
       playerApiKey: playerApiKey.trim() || undefined,
       guildApiKey: guildApiKey.trim() || undefined,
     });
   }
   ```

4. Update button state:
   - Change `disabled={saving}` to `disabled={saveMutation.isPending}`

5. Update error display:
   - Replace `{error && <div>{error}</div>}` with conditional based on toast (error is now in callback)
   - Or use inline error: `{saveMutation.isError && <div>{saveMutation.error?.message}</div>}`

6. Update success feedback:
   - Remove the conditional render based on `saved` state if it was just a message
   - Keep the toast success from `onSuccess` callback

**Testing:**
- Fill form and submit
- Verify success toast appears
- Verify button is disabled during request
- Test with invalid credentials to verify error toast

---

### 2. `src/0-routes/_authenticated/roster.tsx` ✅ COMPLETED

**Current State:**
- 1 mutation: `shareRoster`
- Currently no visible error/loading state management in handlers
- Likely needs user feedback added

**Changes Applied:**
- ✅ Added `onSuccess` callback with success toast
- ✅ Added `onError` callback with error toast
- ✅ Added null-safe operator for token return: `result?.token ?? null`
- ✅ No try/catch wrapper needed (dialog handles async pattern)
- ✅ User gets immediate feedback on success/error
- ✅ No TypeScript or lint errors

**Testing:**
- Trigger share action
- Verify success toast appears
- Verify button is disabled during request (where applicable)
- Test error scenario to verify error toast

---

### 3. `src/0-routes/_authenticated/gw-offense.tsx` ✅ COMPLETED

**Current State (before change):**
- 1 mutation: `saveGw`
- Multiple handlers call `saveGw.mutateAsync()` throughout the component
- No centralized success/error feedback previously

**Changes Applied:**
- ✅ Added `onSuccess` callback to `saveGw` mutation that shows a success toast: "GW offense saved successfully"
- ✅ Added `onError` callback to `saveGw` mutation that shows an error toast with the mutation error message (or a generic message)
- ✅ Ensured handlers continue to call `saveGw.mutateAsync(...)` without wrapping in try/catch
- ✅ Left UI controls to use `saveGw.isPending` for disabling (where applicable)
- ✅ No TypeScript or lint errors after change

**Notes:**
- Because Convex syncs via WebSockets, there's no cache invalidation required — handlers simply call `mutateAsync()` and the server/Convex subscription updates the UI state.
- The `onSuccess`/`onError` callbacks centralize feedback so that callers can remain simple and free of try/catch wrappers.

**Testing:**
- Make changes and save
- Verify success toast
- Verify save-related controls are disabled during pending state
- Test error scenario to verify error toast

---

### 4. `src/0-routes/_authenticated/roster-snapshots.tsx`

**Current State:**
- 1 mutation: `save`

**Instructions:**

1. Update `save` mutation:
   ```tsx
   const save = useMutation({
     mutationFn: useConvexMutation(api.rosterSnapshots.save),
     onSuccess: () => {
       toast.success("Roster snapshot saved successfully");
     },
     onError: (error) => {
       toast.error(
         error instanceof Error ? error.message : "Failed to save snapshot"
       );
     },
   });
   ```

2. Find all calls to `save.mutateAsync()` and remove surrounding try/catch blocks
3. Disable buttons with `save.isPending`

**Testing:**
- Save snapshot
- Verify success toast
- Verify button disabled state

---

## Priority 2: Component Mutations

### 5. `src/1-components/ImportButton.tsx`

**Current State:**
- 1 mutation: `importAll`
- Manual state: `[importing, setImporting]`
- Try/catch/finally wrapper with multiple toast notifications

**Instructions:**

1. Remove state:
   ```
   const [importing, setImporting] = useState(false);
   ```

2. Update `importAll` mutation:
   ```tsx
   const importAll = useMutation({
     mutationFn: useConvexMutation(api.import.importAll),
     onSuccess: () => {
       // Show consolidated success toast (summary)
     },
     onError: (error) => {
       toast.error(error instanceof Error ? error.message : "Failed to import file");
     },
   });
   ```

3. Refactor `handleImport`:
   - Keep parsing logic and pre-validation
   - Call `importAll.mutateAsync(...)` without wrapping in try/catch
   - Use `importAll.isPending` to control UI
   - Show detailed success toast (summary) either in `onSuccess` or directly after `mutateAsync` if it depends on local parsing results

4. Replace `setImporting` uses with `importAll.isPending`

**Testing:**
- Import a valid planner export
- Verify success toast contains summary
- Verify error toast for invalid file
- Verify upload controls disabled while pending

---

### 6. `src/1-components/CampaignProgressSync.tsx`

**Current State:**
- 1 mutation: `saveMutation`
- Uses `lastSavedRef` to avoid immediate re-save
- Calls `mutateAsync()` from an effect

**Instructions:**

1. Update `saveMutation`:
   ```tsx
   const saveMutation = useMutation({
     mutationFn: useConvexMutation(api.campaignProgress.save),
     onSuccess: (_, variables) => {
       // Update lastSavedRef based on the serialized data that was saved
     },
     onError: () => {
       // no-op or log for retries
     },
     retry: 2, // consider retrying transient failures
   });
   ```

2. Phase C effect:
   - Remove try/catch wrapper around `mutateAsync()`
   - Call `saveMutation.mutateAsync({ data: serialized })` when needed
   - Update `lastSavedRef` in `onSuccess` callback so it's consistent

3. Keep `convexMergedRef` logic to ensure initial load/merge occurs once

**Testing:**
- Modify campaign progress and observe saves
- Verify `lastSavedRef` prevents immediate re-saves when appropriate
- Test intermittent network to ensure retry behavior works

---

### 7. `src/1-components/goals/AddGoalDialog.tsx`

**Current State:**
- 1 mutation: `addGoal`
- Dialog open state management and submit handler uses async/await

**Instructions:**
1. Add `onSuccess` and `onError` callbacks:
   - `onSuccess`: close dialog and toast success
   - `onError`: toast error
2. Remove try/catch wrappers from submit handlers; call `addGoal.mutateAsync(...)`
3. Use `addGoal.isPending` to disable submit

**Testing:**
- Add a goal and ensure dialog closes and toast displays
- Test validation and error paths

---

### 8. `src/1-components/goals/EditGoalDialog.tsx`

**Current State:**
- 1 mutation: `updateGoal`
- Dialog edit flow similar to AddGoalDialog

**Instructions:**
1. Add `onSuccess` and `onError` callbacks:
   - `onSuccess`: close dialog and toast success
   - `onError`: toast error
2. Remove try/catch wrappers from submit handlers; call `updateGoal.mutateAsync(...)`
3. Use `updateGoal.isPending` to disable submit

**Testing:**
- Edit a goal and ensure dialog closes and toast appears
- Test error paths

---

## Priority 3: Multi-Mutation Pages

### 9. `src/0-routes/_authenticated/teams.tsx`

**Current State:**
- 3 mutations: `addTeam`, `updateTeam`, `removeTeam`
- Dialog state management
- Handlers use async/await

**Instructions:**
1. Add `onSuccess` / `onError` callbacks to each mutation:
   - `addTeam.onSuccess`: close add dialog and toast
   - `updateTeam.onSuccess`: clear editing state and toast
   - `removeTeam.onSuccess`: clear deleting state and toast
2. Remove try/catch wrappers from handlers; call `mutateAsync(...)`
3. Use `isPending` flags to disable buttons

**Testing:**
- Add, edit, and remove teams; verify toasts and UI state
- Test error cases

---

### 10. `src/0-routes/_authenticated/lre.tsx`

**Current State:**
- 4 mutations: `saveProgressMutation`, `addTeamMutation`, `updateTeamMutation`, `removeTeamMutation`
- Multiple UI interactions

**Instructions:**
1. Add `onSuccess` / `onError` callbacks for each mutation with toast feedback
2. Remove try/catch wrappers from handlers and use `mutateAsync(...)`
3. Use `isPending` to guard UI while operations are in flight

**Testing:**
- Save progress and manage LRE teams; verify toasts and UI behavior
- Test error handling

---

### 11. `src/0-routes/_authenticated/goals.tsx`

**Current State:**
- 4 mutations: `removeGoal`, `removeAllGoals`, `updateGoal`, `reorderGoals`
- Many handlers call these mutations

**Instructions:**
1. Add `onSuccess` and `onError` callbacks to each mutation (toasts + UI adjustments)
2. Consider `onMutate` optimistic updates for higher-perceived performance (optional — test carefully)
3. Remove try/catch wrappers from handlers; call `mutateAsync(...)`
4. Use `isPending` to disable relevant UI while mutation is in progress

**Testing:**
- Delete, update, and reorder goals; verify toasts and UI updates
- Test optimistic update rollback paths if implemented

---

## General Testing Checklist

After completing each file:

- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Success toast appears on successful mutation
- [ ] Error toast appears on failed mutation
- [ ] UI controls are disabled during pending state (`mutation.isPending`)
- [ ] Manual state variables (`loading`, `saving`, `error`, etc.) are removed
- [ ] No `try/catch` blocks wrapping `mutateAsync()` calls
- [ ] No stray `await` on `mutateAsync()` unless component specifically needs to wait
- [ ] Test in browser with network tab open to verify requests are sent
- [ ] Test with slow network to verify loading states appear

---

## Pattern Summary

Every refactored mutation should follow this structure:

```tsx
const myMutation = useMutation({
  mutationFn: useConvexMutation(api.resource.action),
  onSuccess: () => {
    // Close dialogs, update local state, show success feedback
    toast.success("Action completed successfully");
  },
  onError: (error) => {
    // Show error feedback only - no try/catch needed
    toast.error(
      error instanceof Error ? error.message : "Action failed"
    );
  },
});

// Handler becomes simple:
const handleAction = async (data: Data) => {
  myMutation.mutateAsync(data);
  // No try/catch, no manual state updates
};

// UI uses mutation state:
<button disabled={myMutation.isPending}>
  {myMutation.isPending ? "Loading..." : "Submit"}
</button>
```

---

## Notes & Rationale

- Convex provides real-time syncing; manual cache invalidation is unnecessary. Mutations should focus on side-effects (toasts, closing dialogs, local UI changes) and rely on Convex to propagate updated data to queries.
- Centralizing error handling reduces repetition and improves consistency across the app.
- Removing local loading/error state reduces risk of inconsistent UI states and simplifies components.

---

## Next Steps (PAUSED)

Files 1-3 are completed and marked above. No further changes will be made in this run. When you are ready to continue, tell me which file to proceed with next and I will resume the refactor from the plan.