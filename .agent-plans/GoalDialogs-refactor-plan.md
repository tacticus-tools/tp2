# Agent Plan: Refactor Goal Dialogs to Use TanStack Query State

**Created:** 2026-03-05  
**Status:** Not Started  
**Last Updated:** 2026-03-05

## High-Level Goal

Remove manual loading state management from `AddGoalDialog.tsx` and `EditGoalDialog.tsx` by using TanStack Query's built-in `isPending` state instead of duplicate `useState` variables.

## Success Criteria

- [ ] Remove `useState(false)` for `saving` state from both dialog components
- [ ] Update button disabled logic to use `mutation.isPending`
- [ ] Update button UI to show spinner from `mutation.isPending`
- [ ] Simplify `handleSave` functions by removing manual state management
- [ ] Add optional error display using `mutation.isError` and `mutation.error`
- [ ] Both dialogs remain fully functional
- [ ] TypeScript compilation passes
- [ ] No lint errors
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git

## Implementation Plan

### Step 1: Remove Manual Saving State (AddGoalDialog)

**Goal:** Eliminate `useState(false)` for `saving` state and use mutation's `isPending` instead

**Reasoning:** TanStack Query mutations already provide loading state; duplicating it creates inconsistency and potential sync bugs.

**Substeps:**
1. [ ] Locate and delete `const [saving, setSaving] = useState(false);`
2. [ ] Find `isSaveDisabled` function and replace `saving` check with `addGoal.isPending`
3. [ ] Update Save button:
   - Replace `disabled={isSaveDisabled}` (no change needed, but validate)
   - Add loading spinner: `{addGoal.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}`
   - Update button text: `{addGoal.isPending ? "Saving..." : "Save Goal"}`
4. [ ] Simplify `handleSave` function:
   - Remove `setSaving(true)` at start
   - Remove `setSaving(false)` from finally block
   - Keep all form validation and mutation call logic
5. [ ] Test that form submission still works
6. [ ] Verify button disables during save and enables after completion

**Success Indicator:**
- [x] `AddGoalDialog.tsx` no longer has `saving` state variable
- [x] Save button uses `addGoal.isPending` for disabled state
- [x] Save button shows spinner while saving
- [x] Goal can be successfully added
- [x] Form resets after save
- [x] Dialog closes after save
- [x] No console errors or warnings
- [x] No TypeScript errors

**Commit:** `git commit -m 'refactor(goals): remove manual saving state from AddGoalDialog'`

**Progress:** ⬜ Not started

---

### Step 2: Remove Manual Saving State (EditGoalDialog)

**Goal:** Apply identical refactoring to the Edit dialog

**Reasoning:** Both dialogs follow the same pattern; consistency across components reduces maintenance burden.

**Substeps:**
1. [ ] Locate and delete `const [saving, setSaving] = useState(false);`
2. [ ] Find `isSaveDisabled` function and replace `saving` check with `updateGoal.isPending`
3. [ ] Update Update button:
   - Replace `disabled={isSaveDisabled}` (no change needed, but validate)
   - Add loading spinner: `{updateGoal.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}`
   - Update button text: `{updateGoal.isPending ? "Updating..." : "Update Goal"}`
4. [ ] Simplify `handleSave` function:
   - Remove `setSaving(true)` at start
   - Remove `setSaving(false)` from finally block
   - Keep all form logic intact
5. [ ] Test that goal editing still works
6. [ ] Verify button states during async operation

**Success Indicator:**
- [x] `EditGoalDialog.tsx` no longer has `saving` state variable
- [x] Update button uses `updateGoal.isPending` for disabled state
- [x] Update button shows spinner while updating
- [x] Goal can be successfully updated
- [x] Dialog closes after update
- [x] No console errors or warnings
- [x] No TypeScript errors

**Commit:** `git commit -m 'refactor(goals): remove manual saving state from EditGoalDialog'`

**Progress:** ⬜ Not started

---

### Step 3: Add Error Display (Optional Enhancement)

**Goal:** Display mutation errors in dialogs with optional retry capability

**Reasoning:** Users should see error messages instead of silent failures; retry capability improves UX.

**Substeps:**
1. [ ] Add error display in AddGoalDialog:
   - Add after form fields: `{addGoal.isError && <div className="text-sm text-red-500">Failed to save goal: {addGoal.error?.message || "Unknown error"}</div>}`
2. [ ] Add error display in EditGoalDialog:
   - Add after form fields: `{updateGoal.isError && <div className="text-sm text-red-500">Failed to update goal: {updateGoal.error?.message || "Unknown error"}</div>}`
3. [ ] Reset error on dialog reopen:
   - AddGoalDialog: call `addGoal.reset()` in `onOpenChange` when closing
   - EditGoalDialog: call `updateGoal.reset()` when closing
4. [ ] Test error scenarios:
   - Intentionally trigger Convex function errors
   - Verify error displays in dialog
   - Verify error clears on retry

**Success Indicator:**
- [ ] Error messages display when mutations fail
- [ ] Error state clears when dialog reopens or user retries
- [ ] User-friendly error messages shown
- [ ] No console errors

**Commit:** `git commit -m 'refactor(goals): add error handling to goal dialogs'`

**Progress:** ⬜ Not started

---

### Step 4: Test & Validate

**Goal:** Run comprehensive tests across both dialogs and related goal functionality

**Reasoning:** Integration testing ensures changes work correctly with the rest of the goals system.

**Substeps:**
1. [ ] Run `bun run dev` and navigate to goals page
2. [ ] Test AddGoalDialog:
   - [ ] Dialog opens without errors
   - [ ] Form fields render correctly
   - [ ] Save button disabled when validation fails
   - [ ] Clicking Save disables button and shows spinner
   - [ ] Goal is added successfully
   - [ ] Form resets after save
   - [ ] Dialog closes after save
   - [ ] Can add multiple goals in sequence
3. [ ] Test EditGoalDialog:
   - [ ] Dialog opens with existing goal data
   - [ ] Update button properly enabled/disabled
   - [ ] Clicking Update disables button and shows spinner
   - [ ] Goal is updated successfully
   - [ ] Dialog closes after update
4. [ ] Test error scenarios (if Step 3 implemented):
   - [ ] Error messages display correctly
   - [ ] Can retry after error
   - [ ] Error clears on successful retry
5. [ ] Run `bun run build-ci` and verify no errors

**Success Indicator:**
- [x] All dialog functionality works correctly
- [x] No TypeScript errors
- [x] No lint errors
- [x] Build passes
- [x] All tests pass

**Commit:** `git commit -m 'test(goals): verify dialog refactoring works end-to-end'`

**Progress:** ⬜ Not started

---

## Implementation Details

### Before: AddGoalDialog Pattern
```typescript
const [saving, setSaving] = useState(false);

const isSaveDisabled = (() => {
  if (saving || !selectedUnit) return true;
  // ... validation logic
})();

async function handleSave() {
  setSaving(true);
  try {
    await addGoal.mutateAsync({...});
    resetForm();
    setOpen(false);
  } finally {
    setSaving(false);
  }
}

<AlertDialogAction onClick={handleSave} disabled={isSaveDisabled}>
  Save Goal
</AlertDialogAction>
```

### After: AddGoalDialog Pattern
```typescript
// No saving state variable needed!

const isSaveDisabled = (() => {
  if (addGoal.isPending || !selectedUnit) return true;
  // ... validation logic
})();

async function handleSave() {
  try {
    await addGoal.mutateAsync({...});
    resetForm();
    setOpen(false);
  } catch (error) {
    console.error("Failed to save goal:", error);
  }
}

<AlertDialogAction onClick={handleSave} disabled={isSaveDisabled}>
  {addGoal.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
  {addGoal.isPending ? "Saving..." : "Save Goal"}
</AlertDialogAction>
```

## Notes & Decisions

- **State Redundancy**: The `saving` state was duplicating what the mutation already tracked; removing it simplifies the component
- **No Behavior Change**: This is purely an internal refactoring; component API and user experience remain identical
- **Error Handling**: Step 3 (error display) is optional but recommended for better UX
- **Reusability**: The same pattern applies to both dialogs, making them consistent

## References

- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Mutation State Management](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-states)

---

**Status Summary:** This refactoring removes unnecessary manual state management, making the dialogs simpler and more maintainable. Complete Step 1 first (AddGoalDialog), validate it works, then replicate the same changes to Step 2 (EditGoalDialog).