# ImportButton Refactoring Plan: Tanstack Query Integration

## Overview
This document outlines a step-by-step refactoring of `ImportButton.tsx` to use TanStack Query (React Query v5) for managing the file import operation. The plan is organized to complete the feature in stages, with the component remaining in a functional state after each step.

## Current State Analysis

### Current Implementation Issues
1. **Manual State Management**: Uses `useState(false)` for the `importing` loading state
2. **Redundant Mutation**: Already uses `useMutation` from TanStack Query, but manually manages loading state separately
3. **Inconsistent Pattern**: Uses TanStack Query for the API call but doesn't leverage its built-in state management
4. **No Error State Management**: Errors are handled with try/catch and toast notifications, but no explicit error state
5. **File Input Management**: Manual ref management for file input reset

### Current Data Flow
```
User clicks Import button
  ↓
Dialog opens
  ↓
User selects file
  ↓
handleImport() called
  ↓
setImporting(true)
  ↓
Parse file
  ↓
Call Convex mutation via mutateAsync
  ↓
Completion/Error
  ↓
setImporting(false)
  ↓
Show toast (success or error)
  ↓
Reset file input
```

## Refactoring Strategy

This component is simpler than `ShareRosterDialog` because it already uses `useMutation`. The refactoring focuses on:
1. Leveraging the existing mutation's `isPending` state instead of manual `importing` state
2. Using mutation callbacks (`onSuccess`, `onError`) for side effects
3. Removing the manual `importing` state entirely

---

## STEP 1: Remove Manual Loading State and Use Mutation State

### 1.1: Understand Current Mutation
The component already has a `useMutation` that wraps the Convex mutation:
```tsx
const importAll = useMutation({
  mutationFn: useConvexMutation(api.import.importAll),
});
```

This mutation already provides `isPending` state automatically.

### 1.2: Remove Manual State Variable
- [ ] Delete this line:
  ```tsx
  const [importing, setImporting] = useState(false);
  ```

### 1.3: Update Button Disabled State
Replace references to `importing` with `importAll.isPending`:

**Before**:
```tsx
<AlertDialogTrigger asChild>
  <Button
    variant="ghost"
    size="icon"
    disabled={importing}
    title={importing ? "Importing..." : "Import from Tacticus Planner"}
    aria-label={
      importing ? "Importing..." : "Import from Tacticus Planner"
    }
  >
    <Upload className="size-4" />
  </Button>
</AlertDialogTrigger>
```

**After**:
```tsx
<AlertDialogTrigger asChild>
  <Button
    variant="ghost"
    size="icon"
    disabled={importAll.isPending}
    title={importAll.isPending ? "Importing..." : "Import from Tacticus Planner"}
    aria-label={
      importAll.isPending ? "Importing..." : "Import from Tacticus Planner"
    }
  >
    <Upload className="size-4" />
  </Button>
</AlertDialogTrigger>
```

### 1.4: Simplify Event Handler
The `handleImport` function currently manages both the parsing logic and the loading state. Simplify it by removing the manual state management:

**Before**:
```tsx
const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setImporting(true);
  try {
    const text = await file.text();
    // ... parsing logic
    
    await importAll.mutateAsync({
      // ... mutation data
    });
    
    // ... toast notifications
  } catch {
    toast.error(
      "Failed to parse file. Make sure it's a valid Tacticus Planner export.",
    );
  } finally {
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
};
```

**After**:
```tsx
const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    // ... parsing logic remains the same
    
    await importAll.mutateAsync({
      // ... mutation data remains the same
    });
    
    // ... toast notifications remain the same
  } catch {
    toast.error(
      "Failed to parse file. Make sure it's a valid Tacticus Planner export.",
    );
  } finally {
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
};
```

**Key Changes**:
- Remove `setImporting(true)` at the start
- Remove `setImporting(false)` from finally block
- The mutation's `isPending` state handles loading automatically

### 1.5: Update Imports (Optional Cleanup)
- [ ] If `useState` is no longer used, you can remove it from imports:
  ```tsx
  // Remove: import { useState } from "react";
  // Keep other imports as-is
  ```
  
  Actually, keep this import for now since you may use state elsewhere or for consistency.

### 1.6: Verification
After completing Step 1:
- [ ] Component no longer has `importing` state variable
- [ ] Button disabled state uses `importAll.isPending`
- [ ] Button title and aria-label use `importAll.isPending`
- [ ] Clicking import button disables it during the operation
- [ ] File can be imported successfully
- [ ] Error toast still shows on failure
- [ ] File input resets after import attempt
- [ ] No console errors or warnings

---

## STEP 2: Add Error State Display (Optional Enhancement)

### 2.1: Display Mutation Errors
Currently, errors are only shown via toast notifications. Add visual feedback in the dialog:

Add this after the file selection trigger, inside the `AlertDialogContent`:
```tsx
{importAll.isError && (
  <div className="text-sm text-red-500 mb-4">
    Failed to import: {importAll.error?.message || "Unknown error"}
  </div>
)}
```

### 2.2: Reset Error State on Retry
Add a callback to reset the error state when the user tries again:

```tsx
const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // Clear previous errors
  importAll.reset();
  
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    // ... rest of the function
  } catch {
    toast.error(
      "Failed to parse file. Make sure it's a valid Tacticus Planner export.",
    );
  } finally {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
};
```

### 2.3: Verification
After completing Step 2:
- [ ] Error messages display in the dialog
- [ ] Error state clears when retrying import
- [ ] All previous functionality still works
- [ ] Error messages are user-friendly

---

## Final Component Structure

After all steps, your `ImportButton.tsx` should look like:

```tsx
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import { parsePlannerExport } from "@/4-lib/general/import-planner.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export function ImportButton() {
  const importAll = useMutation({
    mutationFn: useConvexMutation(api.import.importAll),
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    importAll.reset();
    
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parsePlannerExport(text);

      const hasAnyData =
        result.goals.length > 0 ||
        result.campaignProgress !== null ||
        result.rosterSnapshots !== null ||
        (result.lreProgress !== null && result.lreProgress.length > 0) ||
        (result.lreTeams !== null && result.lreTeams.length > 0);

      if (!hasAnyData) {
        toast.error("No data was imported.", {
          description:
            result.skipped.length > 0
              ? `Skipped: ${result.skipped.join(", ")}`
              : undefined,
        });
        return;
      }

      await importAll.mutateAsync({
        goals: result.goals.length > 0 ? result.goals : undefined,
        campaignProgress: result.campaignProgress
          ? JSON.stringify(result.campaignProgress)
          : undefined,
        rosterSnapshots: result.rosterSnapshots ?? undefined,
        lreProgress:
          result.lreProgress && result.lreProgress.length > 0
            ? result.lreProgress
            : undefined,
        lreTeams:
          result.lreTeams && result.lreTeams.length > 0
            ? result.lreTeams
            : undefined,
      });

      if (result.campaignProgress) {
        useCampaignProgressStore.setState({
          progress: result.campaignProgress,
        });
      }

      const summary = [
        result.goals.length > 0 && `${result.goals.length} goals`,
        result.campaignProgress &&
          `${Object.keys(result.campaignProgress).length} campaigns`,
        result.rosterSnapshots && "1 roster snapshot",
        result.lreProgress &&
          result.lreProgress.length > 0 &&
          `${result.lreProgress.length} LRE events`,
        result.lreTeams &&
          result.lreTeams.length > 0 &&
          `${result.lreTeams.length} LRE teams`,
      ]
        .filter(Boolean)
        .join(", ");

      toast.success(`Imported: ${summary}`, {
        description:
          result.skipped.length > 0
            ? `Skipped: ${result.skipped.join(", ")}`
            : undefined,
      });
    } catch {
      toast.error(
        "Failed to parse file. Make sure it's a valid Tacticus Planner export.",
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={importAll.isPending}
            title={importAll.isPending ? "Importing..." : "Import from Tacticus Planner"}
            aria-label={
              importAll.isPending ? "Importing..." : "Import from Tacticus Planner"
            }
          >
            <Upload className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import from Tacticus Planner</AlertDialogTitle>
            <AlertDialogDescription>
              Import your data from a Tacticus Planner export file (.json). This
              will import goals, campaign progress, roster snapshots, LRE
              progress, and LRE teams. Existing data in imported sections will
              be replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {importAll.isError && (
            <div className="text-sm text-red-500">
              Failed to import: {importAll.error?.message || "Unknown error"}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
              Choose File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Loading State** | Manual `useState(false)` | Uses `importAll.isPending` |
| **Error State** | Toast only | Toast + optional dialog display |
| **State Variables** | 1 (`importing`) | 0 (all from mutation) |
| **Code Clarity** | Manual state synchronization | Automatic via mutation |
| **Type Safety** | Basic | Full with mutation types |

---

## Testing Checklist

### After Step 1:
- [ ] Import button renders without errors
- [ ] Button is disabled while import is in progress
- [ ] Button enables after import completes
- [ ] File can be successfully imported
- [ ] Error toast shows on parse failure
- [ ] File input resets after import attempt
- [ ] No console errors or warnings

### After Step 2:
- [ ] Error messages display in the dialog
- [ ] Error state clears when retrying
- [ ] All previous functionality still works
- [ ] Error display is user-friendly

---

## Benefits of This Refactoring

1. **Reduced Boilerplate**: Eliminates manual loading state management
2. **Built-in Error Handling**: Automatic error state available via mutation
3. **Consistency**: Uses TanStack Query patterns consistently
4. **Better UX**: Explicit error display in addition to toast
5. **Type Safety**: Better TypeScript support with mutation types
6. **Maintainability**: Less state to manage and synchronize
7. **Testability**: Easier to test mutation behavior

---

## Migration Complexity: **Very Low** ✅

- Minimal changes required (mainly removing one state variable)
- Component already uses TanStack Query correctly
- No breaking changes to component API
- Can be completed in a single, simple step
- Easy to rollback if needed

---

## References

- [TanStack Query v5 Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [useMutation API Reference](https://tanstack.com/query/v5/docs/reference/useMutation)
- [Mutation State Management](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-state)