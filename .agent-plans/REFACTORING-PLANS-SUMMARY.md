# TanStack Query Refactoring Plans Summary

This document provides an overview of all refactoring plans for converting manual async state management to TanStack Query v5.

## Purpose

These plans guide the refactoring of components that currently use `useState` for managing loading and error states in async operations. By adopting TanStack Query, we standardize async state management across the codebase and gain benefits like:

- Automatic loading/error state management
- Built-in retry logic
- Error state visibility
- Better testability
- Reduced boilerplate

## Refactoring Plans

### 1. ShareRosterDialog Refactoring
**File**: `.local/ShareRosterDialog-refactor.md`
**Component**: `src/1-components/roster/ShareRosterDialog.tsx`

**Current State**: Manual `useState` for download and share operations
- `downloading` state
- `copying` state
- `copied` state

**Refactoring Approach**: Two separate operations, refactored one at a time
- **Step 1**: Refactor image download feature
- **Step 2**: Refactor link sharing feature
- **Step 3**: Add error handling display (optional)
- **Step 4**: Extract to custom hook (optional)

**Complexity**: Low
**Estimated Changes**: 2 new hook files + component refactoring

---

### 2. ImportButton Refactoring
**File**: `.local/ImportButton-refactor.md`
**Component**: `src/1-components/ImportButton.tsx`

**Current State**: Already uses `useMutation` but also manages `importing` state manually
- Redundant state management
- Already has mutation in place

**Refactoring Approach**: Simplest refactoring (already 90% complete)
- **Step 1**: Remove `importing` state, use `importAll.isPending`
- **Step 2**: Add error display (optional)

**Complexity**: Very Low
**Estimated Changes**: Minimal (remove 1 state variable, update references)

---

### 3. Goal Dialogs Refactoring
**File**: `.local/GoalDialogs-refactor.md`
**Components**: 
- `src/1-components/goals/AddGoalDialog.tsx`
- `src/1-components/goals/EditGoalDialog.tsx`

**Current State**: Both dialogs use `saving` state manually while having mutations
- `saving` state in both files
- Already use `useMutation` for API calls

**Refactoring Approach**: Identical pattern in both files
- **Step 1**: Remove `saving` state, use mutation's `isPending`
- **Step 2**: Add error display (optional)

**Complexity**: Low
**Estimated Changes**: Remove 1 state variable per file, update references

---

## Quick Reference

### Files to Refactor (Priority Order)

1. **ImportButton.tsx** (Easiest - 10 minutes)
   - Only need to remove 1 state variable
   - Already uses mutation correctly

2. **AddGoalDialog.tsx** (Easy - 15 minutes)
   - Remove 1 state variable
   - Similar pattern across the file

3. **EditGoalDialog.tsx** (Easy - 15 minutes)
   - Same refactoring as AddGoalDialog
   - Can be done identically

4. **ShareRosterDialog.tsx** (Moderate - 30 minutes)
   - Most comprehensive refactoring
   - Requires creating custom hooks
   - Best example of complete TanStack Query adoption

### New Files to Create

When implementing the ShareRosterDialog plan:
- `src/2-hooks/mutations/useDownloadRosterImage.ts`
- `src/2-hooks/mutations/useShareRosterLink.ts`

Optional extraction:
- `src/2-hooks/mutations/useRosterShare.ts` (consolidates both hooks)

## Implementation Sequence Recommendations

### Fastest Path (Just Remove Manual State)
1. ImportButton.tsx
2. AddGoalDialog.tsx
3. EditGoalDialog.tsx
4. (Skip ShareRosterDialog hooks, do basic refactoring)

**Estimated Time**: 45 minutes

### Comprehensive Path (Including Custom Hooks)
1. ImportButton.tsx
2. AddGoalDialog.tsx
3. EditGoalDialog.tsx
4. ShareRosterDialog.tsx (with custom hook extraction)

**Estimated Time**: 90 minutes

### Minimal Path (Cherry Pick)
1. ImportButton.tsx (simplest, most impact)

**Estimated Time**: 10 minutes

## Common Patterns Across Plans

All refactoring plans follow this pattern:

### Before (Manual State)
```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await mutation.mutateAsync(data);
    onSuccess();
  } finally {
    setLoading(false);
  }
};

// In JSX:
disabled={loading}
{loading && <Spinner />}
```

### After (TanStack Query)
```tsx
const mutation = useMutation({ ... });

const handleAction = async () => {
  await mutation.mutate(data);
};

// In JSX:
disabled={mutation.isPending}
{mutation.isPending && <Spinner />}
```

## Benefits Summary

| Benefit | Before | After |
|---------|--------|-------|
| **State Management** | Manual | Automatic |
| **Error Handling** | Silent | Explicit |
| **Code Clarity** | Mixed patterns | Consistent |
| **Boilerplate** | More | Less |
| **Type Safety** | Basic | Full |
| **Testability** | Harder | Easier |

## Notes

### TanStack Query Already Installed
- All projects already have `@tanstack/react-query` v5 installed
- QueryClientProvider is already configured
- No dependency installation needed

### Mutation Hooks Naming Convention
- Use `use` prefix for hooks (React convention)
- Location: `src/2-hooks/mutations/` or `src/3-hooks/mutations/`
- Name: `use<Feature><Action>` (e.g., `useDownloadRosterImage`)

### Testing After Each Step
- Each plan includes a verification checklist
- Component should remain functional after each step
- No breaking changes to component APIs

### Optional Enhancements
All plans mark certain steps as "optional":
- Error display UI
- Custom hook extraction
- Retry configuration
- Mutation keys for DevTools

These can be skipped if you want to complete refactoring quickly, then added later.

## References

All plans reference the same core documentation:
- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Mutation State Management](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-states)

## Execution Checklist

- [ ] Review desired scope (fast vs comprehensive)
- [ ] Choose starting component
- [ ] Read the relevant refactoring plan
- [ ] Follow Step 1 for chosen component
- [ ] Verify component still works
- [ ] Move to next component or Step 2
- [ ] Test all modified components together
- [ ] Commit with clear message referencing the plan

## Questions?

Each plan document includes:
- Current state analysis
- Detailed step-by-step instructions
- Code examples (before and after)
- Verification checklists
- Testing guidance

Refer to the specific plan for your chosen component for comprehensive guidance.