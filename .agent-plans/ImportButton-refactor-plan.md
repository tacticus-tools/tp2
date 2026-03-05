# Agent Plan: Refactor ImportButton to Use TanStack Query State Management

**Created:** 2026-03-05  
**Status:** Not Started  
**Last Updated:** 2026-03-05

## High-Level Goal

Eliminate manual loading state management in `ImportButton.tsx` by leveraging TanStack Query's built-in `isPending` state, centralizing error handling through mutation callbacks, and improving user feedback during file import operations.

## Success Criteria

- [ ] Remove `useState(false)` for manual `importing` state
- [ ] Use `importAll.isPending` for button disabled state
- [ ] Use `importAll.isPending` for button label and aria-label
- [ ] Centralize error handling via mutation callbacks (`onSuccess`, `onError`)
- [ ] Display error states in the dialog when applicable
- [ ] File input resets correctly after import attempt
- [ ] All file import operations complete successfully with toasts
- [ ] TypeScript compilation passes
- [ ] No lint errors
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git

## Implementation Plan

### Step 1: Remove Manual Loading State Variable

**Goal:** Delete the `importing` state variable and rely on mutation state instead

**Reasoning:** TanStack Query's `useMutation` hook provides `isPending` state automatically, eliminating the need for manual synchronization.

**Substeps:**
1. [ ] Locate `const [importing, setImporting] = useState(false);`
2. [ ] Delete this line
3. [ ] Verify no other component logic depends on this variable
4. [ ] Search for all references to `importing` variable

**Success Indicator:**
- [ ] Variable is removed
- [ ] No remaining references to `importing` in component code
- [ ] Build succeeds with no errors

**Commit:** Part of Step 2

**Progress:** ⬜ Not started

---

### Step 2: Update Button Disabled & UI States

**Goal:** Replace all `importing` references with `importAll.isPending`

**Reasoning:** This exposes the mutation's built-in loading state to the UI without manual state management.

**Substeps:**
1. [ ] Update button's `disabled` prop:
   - From: `disabled={importing}`
   - To: `disabled={importAll.isPending}`
2. [ ] Update button's `title` attribute:
   - From: `title={importing ? "Importing..." : "Import from Tacticus Planner"}`
   - To: `title={importAll.isPending ? "Importing..." : "Import from Tacticus Planner"}`
3. [ ] Update button's `aria-label`:
   - From: `aria-label={importing ? "Importing..." : "Import from Tacticus Planner"}`
   - To: `aria-label={importAll.isPending ? "Importing..." : "Import from Tacticus Planner"}`
4. [ ] Test button is disabled while import is in progress
5. [ ] Test button is enabled after import completes

**Success Indicator:**
- [ ] Button correctly reflects pending state
- [ ] Button disables during import
- [ ] Button enables after completion
- [ ] Accessibility labels are accurate
- [ ] No TypeScript errors

**Commit:** `git commit -m 'refactor: use mutation.isPending for ImportButton loading state'`

**Progress:** ⬜ Not started

---

### Step 3: Simplify Event Handler

**Goal:** Remove `setImporting` calls from the `handleImport` function

**Reasoning:** Mutation state is automatic; manual state updates are redundant.

**Substeps:**
1. [ ] Open `handleImport` function
2. [ ] Remove `setImporting(true)` at the start
3. [ ] Remove `setImporting(false)` from finally block
4. [ ] Keep all file parsing logic unchanged
5. [ ] Keep all toast notifications unchanged
6. [ ] Keep `fileInputRef.current.value = ""` reset unchanged
7. [ ] Test import still works without manual state management

**Success Indicator:**
- [ ] Function has no `setImporting` calls
- [ ] File parsing logic untouched
- [ ] Toast notifications still work
- [ ] File input resets after import attempt
- [ ] No TypeScript errors
- [ ] Import operations complete successfully

**Commit:** Part of Step 2 or separate commit if more substantial changes

**Progress:** ⬜ Not started

---

### Step 4: Add Error State Display (Optional Enhancement)

**Goal:** Display mutation errors in the dialog alongside toast notifications

**Reasoning:** Visual error feedback in the dialog improves UX and gives users confidence they can retry.

**Substeps:**
1. [ ] Add error display UI after file selection trigger:
   ```tsx
   {importAll.isError && (
     <div className="text-sm text-red-500 mb-4">
       Failed to import: {importAll.error?.message || "Unknown error"}
     </div>
   )}
   ```
2. [ ] Add `importAll.reset()` call at start of `handleImport` to clear previous errors
3. [ ] Test error message displays when import fails
4. [ ] Test error clears when user retries
5. [ ] Verify error display doesn't block file selection flow

**Success Indicator:**
- [ ] Error messages display in dialog when applicable
- [ ] Error state clears on retry
- [ ] All previous functionality still works
- [ ] Error messages are user-friendly

**Commit:** `git commit -m 'refactor: add error state display to ImportButton'`

**Progress:** ⬜ Not started

---

### Step 5: Testing & Validation

**Goal:** Verify all changes work correctly and component remains fully functional

**Reasoning:** Comprehensive testing ensures the refactoring doesn't break existing behavior.

**Substeps:**
1. [ ] Run `bun run dev` and navigate to the import feature
2. [ ] Test successful import:
   - [ ] Select a valid Tacticus Planner export file
   - [ ] Verify button disables during import
   - [ ] Verify success toast appears
   - [ ] Verify file input resets
   - [ ] Verify data is imported correctly
3. [ ] Test error scenarios:
   - [ ] Select an invalid file
   - [ ] Verify error toast appears
   - [ ] Verify error message displays in dialog (if implemented)
   - [ ] Verify file input resets
4. [ ] Test accessibility:
   - [ ] Verify aria-label updates during import
   - [ ] Test with screen reader if available
5. [ ] Run `bun run build-ci` and verify no TypeScript or lint errors

**Success Indicator:**
- [ ] All import operations complete successfully
- [ ] Button state reflects loading correctly
- [ ] Error handling works as expected
- [ ] File input behaves correctly
- [ ] No console errors or warnings
- [ ] Build passes
- [ ] No TypeScript or lint errors

**Commit:** Part of Step 2 or separate: `git commit -m 'test: verify ImportButton refactoring'`

**Progress:** ⬜ Not started

---

## Notes & Decisions

- **No destructuring**: Access mutation state via the mutation object directly (e.g., `importAll.isPending`, `importAll.isError`)
- **File parsing logic unchanged**: The import logic itself (parsing, validation, toasts) doesn't change—only the loading state management
- **Error handling**: Existing toast notifications are preserved; optional dialog error display is an enhancement
- **File input reset**: Critical for allowing the same file to be selected again after import attempt

## References

- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Mutation State Management](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-states)
- [Convex Import API Documentation](https://docs.convex.dev/)

---

**Status Summary:** Ready to start. This is a straightforward refactoring—remove one state variable and replace it with mutation state. Start with Step 1 (remove variable), then Step 2 (update UI), followed by optional enhancements in Step 4. Testing (Step 5) should be done after core changes are complete.