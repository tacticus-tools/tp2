# Agent Plan: Refactor ShareRosterDialog to Idiomatic TanStack Query Patterns

**Created:** 2026-03-05  
**Status:** Not Started  
**Last Updated:** 2026-03-05

## High-Level Goal

Refactor `ShareRosterDialog.tsx` to use TanStack Query v5 mutation patterns with `@convex-dev/react-query`, removing manual state management and centralizing error handling through mutation callbacks.

## Success Criteria

- [ ] `shareRoster` mutation uses `useMutation({ mutationFn: useConvexMutation(...) })`
- [ ] Remove manual `loading`, `error`, and `saved` state variables
- [ ] Use `shareRoster.isPending` for button disabled state
- [ ] Add `onSuccess` callback to display token and close dialog
- [ ] Add `onError` callback to show error toast
- [ ] All mutation state accessed via the mutation object (not destructured)
- [ ] Token display updates correctly on successful share
- [ ] Error toast shows on failed share attempt
- [ ] TypeScript compilation passes
- [ ] No lint errors
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git

## Implementation Plan

### Step 1: Refactor Mutation Definition

**Goal:** Update `shareRoster` to use the TanStack Query pattern

**Reasoning:** This is the foundational change; all other updates depend on it.

**Substeps:**
1. Update imports:
   - Add `import { useQuery } from "@tanstack/react-query"`
   - Add `import { useConvexQuery } from "@convex-dev/react-query"`
   - If `shareRoster` uses `useMutation`, ensure it imports from `@tanstack/react-query` instead of `convex/react`
2. Refactor mutation definition:
   ```tsx
   const shareRoster = useMutation({
     mutationFn: useConvexMutation(api.roster.share),
     onSuccess: (result) => {
       // Will handle in Step 2
     },
     onError: (error) => {
       // Will handle in Step 2
     },
   });
   ```
3. Test that mutation is properly typed and no TypeScript errors appear

**Success Indicator:**
- [x] Mutation defined with TanStack Query pattern
- [x] No TypeScript errors on mutation definition
- [x] Mutation object accessible for state queries

**Commit:** `git commit -m 'refactor: update shareRoster to TanStack Query pattern'`

**Progress:** ⬜ Not started

---

### Step 2: Add Success & Error Callbacks

**Goal:** Centralize side effects through mutation callbacks

**Reasoning:** Callbacks handle user feedback (toasts, token display, dialog closure) without manual state management.

**Substeps:**
1. Implement `onSuccess` callback:
   - Accept the returned token from mutation
   - Display token to user (copy to clipboard, show in dialog, etc.)
   - Show success toast: `"Roster shared successfully"`
   - Close the dialog or reset form as appropriate
2. Implement `onError` callback:
   - Extract error message: `error instanceof Error ? error.message : "Failed to share roster"`
   - Show error toast with message
   - Allow user to retry
3. Example structure:
   ```tsx
   const shareRoster = useMutation({
     mutationFn: useConvexMutation(api.roster.share),
     onSuccess: (result) => {
       toast.success("Roster shared successfully");
       setTokenDisplay(result.token);
       // Or: navigate to share page, open copy dialog, etc.
     },
     onError: (error) => {
       toast.error(
         error instanceof Error ? error.message : "Failed to share roster"
       );
     },
   });
   ```

**Success Indicator:**
- [x] Success callback executes and displays token correctly
- [x] Error callback shows error toast on failure
- [x] User can retry after error
- [x] Dialog closes or form resets after success
- [x] Toast notifications appear as expected

**Commit:** `git commit -m 'refactor: add onSuccess and onError callbacks to shareRoster'`

**Progress:** ⬜ Not started

---

### Step 3: Remove Manual State Management

**Goal:** Eliminate manual loading/error/saved state variables

**Reasoning:** Mutation state is now automatic via `isPending`, `isError`, `error`.

**Substeps:**
1. Identify and remove:
   - `const [loading, setLoading] = useState(false)`
   - `const [error, setError] = useState<string | null>(null)`
   - `const [saved, setSaved] = useState(false)`
   - Any other manual state for mutation tracking
2. Remove manual state updates:
   - Remove `setLoading(true)` before mutation
   - Remove `setLoading(false)` in finally blocks
   - Remove `setError(null)`, `setError(error)` calls
   - Remove `setSaved(true)` on success
3. Test that component still renders correctly without manual state

**Success Indicator:**
- [x] No manual state variables for `loading`, `error`, `saved`
- [x] No `useState` calls for mutation state management
- [x] Component renders without errors
- [x] All state comes from mutation object

**Commit:** `git commit -m 'refactor: remove manual state management from dialog'`

**Progress:** ⬜ Not started

---

### Step 4: Update Button & UI State

**Goal:** Use `shareRoster.isPending` for disabled state and loading indicators

**Reasoning:** Mutation's built-in state is more reliable and requires less code.

**Substeps:**
1. Find the "Share" or "Generate Token" button:
   - Change `disabled={loading}` to `disabled={shareRoster.isPending}`
2. Update button label to show loading state:
   ```tsx
   <Button
     onClick={handleShare}
     disabled={shareRoster.isPending}
   >
     {shareRoster.isPending ? (
       <>
         <Loader2 className="mr-2 size-4 animate-spin" />
         Sharing...
       </>
     ) : (
       "Share Roster"
     )}
   </Button>
   ```
3. Update any loading spinner conditionals:
   - Replace `{loading && <Spinner />}` with `{shareRoster.isPending && <Spinner />}`
4. Test that button disables during share operation
5. Test that button re-enables after completion (success or error)

**Success Indicator:**
- [x] Button disabled while `shareRoster.isPending` is true
- [x] Button re-enables after mutation completes
- [x] Loading indicator shows correct text/spinner
- [x] Button state matches actual mutation state
- [x] No flickering or state mismatches

**Commit:** `git commit -m 'refactor: update button state to use mutation.isPending'`

**Progress:** ⬜ Not started

---

### Step 5: Simplify Handler Functions

**Goal:** Remove try/catch and manual state calls from handlers

**Reasoning:** Mutation callbacks now handle all side effects; handlers can be minimal.

**Substeps:**
1. Find the `handleShare` or similar function
2. Remove try/catch wrapper if present:
   ```tsx
   // BEFORE
   const handleShare = async () => {
     setLoading(true);
     try {
       const result = await shareRoster.mutateAsync({...});
       setToken(result.token);
     } catch (error) {
       setError(error.message);
     } finally {
       setLoading(false);
     }
   };

   // AFTER
   const handleShare = async () => {
     await shareRoster.mutateAsync({...});
   };
   ```
3. Keep any form validation logic before the mutation
4. Remove all `setLoading`, `setError`, `setSaved` calls from handler
5. Test that handler works and callbacks are triggered

**Success Indicator:**
- [x] Handler no longer contains try/catch wrapper
- [x] Handler no longer calls `setLoading`, `setError`, `setSaved`
- [x] Handler calls `shareRoster.mutateAsync()` with correct data
- [x] Callbacks handle all side effects
- [x] User sees success/error feedback via toast

**Commit:** `git commit -m 'refactor: simplify handler by removing manual state management'`

**Progress:** ⬜ Not started

---

### Step 6: Test & Validate

**Goal:** Verify all functionality works correctly after refactoring

**Reasoning:** Comprehensive testing ensures no regressions from the refactoring.

**Substeps:**
1. Run `bun run dev` and navigate to the roster page
2. Test successful share:
   - Click share button
   - Verify button disables and shows loading
   - Verify success toast appears
   - Verify token is displayed to user
   - Verify button re-enables after completion
3. Test error scenario:
   - If possible, trigger an error (network failure, permission denied)
   - Verify error toast shows
   - Verify button re-enables
   - Verify user can retry
4. Test repeated actions:
   - Share multiple times
   - Verify each share works independently
   - Check no state leakage between shares
5. Run `bun run build-ci` and verify no errors
6. Check TypeScript: no compilation warnings
7. Check lint: `bun run fix` passes

**Success Indicator:**
- [x] Share functionality works end-to-end
- [x] Loading states display correctly
- [x] Toast notifications appear as expected
- [x] Repeated shares work without issues
- [x] Build passes without errors
- [x] No TypeScript or lint warnings
- [x] Mutation state always matches UI state

**Commit:** `git commit -m 'test: validate ShareRosterDialog refactoring'`

**Progress:** ⬜ Not started

---

## Notes & Decisions

- **Token Display**: Decide on the best UX for showing the shared token:
  - Copy-to-clipboard button
  - QR code display
  - Link generation
  - Store in state for UI display
- **Toast Duration**: Consider appropriate toast display duration (default is usually 5 seconds)
- **Dialog Closure**: Decide if dialog should close immediately on success or after user sees token
- **Error Recovery**: User should be able to retry without reopening the dialog

## References

- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Convex roster.share API Documentation](https://docs.convex.dev/)
- [sonner Toast Library](https://sonner.emilkowal.ski/)

---

**Status Summary:** Ready to start. This dialog is a good candidate for the TanStack Query pattern since it has a single mutation with clear success/error paths. Follow steps sequentially for best results.