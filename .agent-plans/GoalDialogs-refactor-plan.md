# Goal Dialogs Refactoring Plan: TanStack Query Integration

## Overview
This document outlines a step-by-step refactoring of `AddGoalDialog.tsx` and `EditGoalDialog.tsx` to use TanStack Query v5 for managing asynchronous operations instead of manual `useState` state management for the `saving` state.

The plan is organized to complete one feature at a time, with the components remaining in a functional state after each step.

## Current State Analysis

### Current Implementation Issues (Both Files)

1. **Manual State Management**: Uses `useState(false)` for the `saving` loading state
2. **Redundant Mutation**: Both files already use `useMutation` from TanStack Query, but manually manage loading state separately
3. **Inconsistent Pattern**: Uses TanStack Query for the API call but doesn't leverage its built-in state management
4. **Save Button Validation**: Relies on manual state check `saving` in disabled condition
5. **No Error State Management**: Errors are not explicitly captured or displayed

### Current Data Flow (Both Files)

```
User clicks Save button
  ↓
handleSave() called
  ↓
setSaving(true)
  ↓
Build form data based on goal type
  ↓
Call mutation via mutateAsync
  ↓
Reset form on success
  ↓
Close dialog
  ↓
Completion/Error
  ↓
setSaving(false)
```

## Refactoring Strategy

Both dialogs follow the same pattern:
1. Use existing `useMutation` hook (`addGoal` or `updateGoal`)
2. Remove manual `saving` state
3. Use mutation's `isPending` state instead
4. Simplify event handlers by removing manual state management

The refactoring will be done identically for both files.

---

## STEP 1: Remove Manual Saving State and Use Mutation State

### 1.1: Remove Saving State Variable

In both `AddGoalDialog.tsx` and `EditGoalDialog.tsx`:

**File**: `src/1-components/goals/AddGoalDialog.tsx`
- [ ] Delete this line (around line 79):
  ```tsx
  const [saving, setSaving] = useState(false);
  ```

**File**: `src/1-components/goals/EditGoalDialog.tsx`
- [ ] Delete this line (around line 89):
  ```tsx
  const [saving, setSaving] = useState(false);
  ```

### 1.2: Update Save Button Validation

Both files have a `isSaveDisabled` function that checks the `saving` state. Update it to use the mutation state instead.

**AddGoalDialog.tsx - Before**:
```tsx
const isSaveDisabled = (() => {
  if (saving || !selectedUnit) return true;
  switch (goalType) {
    case PersonalGoalType.UpgradeRank:
      return rankEnd <= rankStart;
    case PersonalGoalType.MowAbilities:
      return primaryEnd < 1 || secondaryEnd < 1;
    case PersonalGoalType.CharacterAbilities:
      return activeEnd < 1 || passiveEnd < 1;
    default:
      return false;
  }
})();
```

**AddGoalDialog.tsx - After**:
```tsx
const isSaveDisabled = (() => {
  if (addGoal.isPending || !selectedUnit) return true;
  switch (goalType) {
    case PersonalGoalType.UpgradeRank:
      return rankEnd <= rankStart;
    case PersonalGoalType.MowAbilities:
      return primaryEnd < 1 || secondaryEnd < 1;
    case PersonalGoalType.CharacterAbilities:
      return activeEnd < 1 || passiveEnd < 1;
    default:
      return false;
  }
})();
```

**EditGoalDialog.tsx - Before**:
```tsx
const isSaveDisabled = (() => {
  if (saving) return true;
  switch (goal.type) {
    case PersonalGoalType.UpgradeRank:
      return rankEnd <= rankStart;
    case PersonalGoalType.MowAbilities:
      // ... validation logic
  }
})();
```

**EditGoalDialog.tsx - After**:
```tsx
const isSaveDisabled = (() => {
  if (updateGoal.isPending) return true;
  switch (goal.type) {
    case PersonalGoalType.UpgradeRank:
      return rankEnd <= rankStart;
    case PersonalGoalType.MowAbilities:
      // ... validation logic
  }
})();
```

### 1.3: Update Save Button UI

Update the Save/Action button to use mutation state for loading indicator.

**AddGoalDialog.tsx - Find and Update**:
Look for the Save button (usually in AlertDialogFooter) and update:
```tsx
<AlertDialogAction
  onClick={handleSave}
  disabled={isSaveDisabled}
>
  {addGoal.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
  {addGoal.isPending ? "Saving..." : "Save Goal"}
</AlertDialogAction>
```

**EditGoalDialog.tsx - Find and Update**:
```tsx
<AlertDialogAction
  onClick={handleSave}
  disabled={isSaveDisabled}
>
  {updateGoal.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
  {updateGoal.isPending ? "Saving..." : "Update Goal"}
</AlertDialogAction>
```

### 1.4: Simplify Event Handler

Both files have a `handleSave` function. Simplify it by removing manual state management.

**AddGoalDialog.tsx - Before**:
```tsx
async function handleSave() {
  if (!selectedUnit) return;

  setSaving(true);
  try {
    let data: Record<string, unknown> = {};
    
    switch (goalType) {
      // ... goal type specific logic
    }

    await addGoal.mutateAsync({
      goalId: crypto.randomUUID(),
      type: goalType,
      unitId: selectedUnit.id,
      unitName: selectedUnit.name,
      priority: goalCount + 1,
      include,
      notes: notes.trim() || undefined,
      data: JSON.stringify(data),
    });

    resetForm();
    setOpen(false);
  } finally {
    setSaving(false);
  }
}
```

**AddGoalDialog.tsx - After**:
```tsx
async function handleSave() {
  if (!selectedUnit) return;

  try {
    let data: Record<string, unknown> = {};
    
    switch (goalType) {
      // ... goal type specific logic remains the same
    }

    await addGoal.mutateAsync({
      goalId: crypto.randomUUID(),
      type: goalType,
      unitId: selectedUnit.id,
      unitName: selectedUnit.name,
      priority: goalCount + 1,
      include,
      notes: notes.trim() || undefined,
      data: JSON.stringify(data),
    });

    resetForm();
    setOpen(false);
  } catch (error) {
    console.error("Failed to save goal:", error);
  }
}
```

**Key Changes**:
- Remove `setSaving(true)` at the start
- Remove `setSaving(false)` from finally block
- Keep all internal logic unchanged
- The mutation's `isPending` state handles loading automatically

**EditGoalDialog.tsx** follows the same pattern. Find the `handleSave` function and remove the `setSaving` calls.

### 1.5: Verification

After completing Step 1:

**For AddGoalDialog.tsx**:
- [ ] Component no longer has `saving` state variable
- [ ] Save button disabled state uses `addGoal.isPending`
- [ ] Save button shows spinner while saving
- [ ] Goal can be successfully added
- [ ] Form resets after successful save
- [ ] Dialog closes after successful save
- [ ] No console errors or warnings

**For EditGoalDialog.tsx**:
- [ ] Component no longer has `saving` state variable
- [ ] Update button disabled state uses `updateGoal.isPending`
- [ ] Update button shows spinner while saving
- [ ] Goal can be successfully updated
- [ ] Dialog closes after successful update
- [ ] No console errors or warnings

---

## STEP 2: Add Error Display (Optional Enhancement)

### 2.1: Display Mutation Errors in AddGoalDialog

After the form fields but before the footer, add error display:

```tsx
{addGoal.isError && (
  <div className="text-sm text-red-500 mt-4">
    Failed to save goal: {addGoal.error?.message || "Unknown error"}
  </div>
)}
```

### 2.2: Display Mutation Errors in EditGoalDialog

Similarly, add after the form fields:

```tsx
{updateGoal.isError && (
  <div className="text-sm text-red-500 mt-4">
    Failed to update goal: {updateGoal.error?.message || "Unknown error"}
  </div>
)}
```

### 2.3: Reset Error State on Dialog Open

In AddGoalDialog, update the dialog's onOpenChange handler to reset errors:

**Before**:
```tsx
<AlertDialog
  open={open}
  onOpenChange={(nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }}
>
```

**After**:
```tsx
<AlertDialog
  open={open}
  onOpenChange={(nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      addGoal.reset();
    }
  }}
>
```

For EditGoalDialog, the parent component controls the `open` prop, so the reset should be handled when closing:

```tsx
const handleClose = () => {
  updateGoal.reset();
  onOpenChange(false);
};
```

Then use this handler in the Cancel button.

### 2.4: Verification

After completing Step 2:
- [ ] Error messages display in the dialog
- [ ] Error state clears when opening/retrying
- [ ] All previous functionality still works
- [ ] Error messages are user-friendly and helpful

---

## Final Component Structures

### AddGoalDialog.tsx Key Changes

**Removed**:
- `const [saving, setSaving] = useState(false);`
- `setSaving(true);` calls
- `setSaving(false);` calls

**Updated**:
- `isSaveDisabled` checks: `saving` → `addGoal.isPending`
- Save button: uses `addGoal.isPending` for loading state
- `handleSave`: removed manual state management

### EditGoalDialog.tsx Key Changes

**Removed**:
- `const [saving, setSaving] = useState(false);`
- `setSaving(true);` calls
- `setSaving(false);` calls

**Updated**:
- `isSaveDisabled` checks: `saving` → `updateGoal.isPending`
- Update button: uses `updateGoal.isPending` for loading state
- `handleSave`: removed manual state management

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Saving State** | Manual `useState(false)` | Uses mutation `isPending` |
| **Error State** | Not captured | Automatic via mutation |
| **State Variables** | 1 (`saving`) per dialog | 0 (all from mutation) |
| **Button Validation** | Checks `saving` flag | Checks `mutation.isPending` |
| **Code Clarity** | Manual state synchronization | Automatic via mutation |
| **Error Handling** | None (silent) | Can display errors |

---

## File Structure After Refactoring

No new files needed. Only existing files are modified:

```
src/1-components/goals/
├── AddGoalDialog.tsx (refactored)
└── EditGoalDialog.tsx (refactored)
```

---

## Testing Checklist

### After Step 1 (AddGoalDialog):
- [ ] Add Goal dialog opens without errors
- [ ] Form fields render correctly
- [ ] Save button is disabled initially when no unit selected
- [ ] Save button enables when unit is selected and validation passes
- [ ] Clicking Save disables the button and shows loading state
- [ ] Goal is successfully added to the database
- [ ] Form resets after successful save
- [ ] Dialog closes after successful save
- [ ] Can add another goal immediately after first one
- [ ] No console errors or warnings

### After Step 1 (EditGoalDialog):
- [ ] Edit Goal dialog opens without errors
- [ ] Form fields populate with existing goal data
- [ ] Update button is properly disabled/enabled based on validation
- [ ] Clicking Update disables the button and shows loading state
- [ ] Goal is successfully updated in the database
- [ ] Dialog closes after successful update
- [ ] No console errors or warnings

### After Step 2 (Error Handling):
- [ ] Error messages display if save/update fails
- [ ] Error messages are cleared when opening dialog again
- [ ] Error state doesn't prevent retry attempts
- [ ] All previous functionality still works

---

## Benefits of This Refactoring

1. **Reduced Boilerplate**: Eliminates manual loading state in both dialogs
2. **Built-in Error Handling**: Automatic error state management via mutation
3. **Consistency**: Both dialogs follow the same TanStack Query patterns
4. **Better UX**: Can display explicit error messages
5. **Type Safety**: Better TypeScript support with mutation types
6. **Maintainability**: Less state to manage and synchronize
7. **Testability**: Easier to test mutation behavior independently

---

## Migration Complexity: **Low** ✅

- Minimal changes required in each dialog (mainly removing one state variable)
- Both dialogs already use TanStack Query correctly
- No breaking changes to component API
- Can be done incrementally (AddGoalDialog first, then EditGoalDialog)
- Easy to rollback if needed

---

## Notes for Implementation

### Handling Both Dialogs

You can refactor both dialogs in the same pull request since they follow identical patterns:

1. **AddGoalDialog.tsx**: Start with this one first as it's simpler
2. **EditGoalDialog.tsx**: Refactor identically after AddGoalDialog is working

### Testing Strategy

Test the goals feature holistically after refactoring:
1. Add a new goal → verify it saves
2. Edit that goal → verify it updates
3. Try adding/editing with invalid data → verify validation still works
4. Trigger error conditions if possible → verify error display works

### Import Statements

Both files already import `useMutation` and have the necessary UI components. No additional imports should be needed.

---

## References

- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Mutation State Management](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-states)