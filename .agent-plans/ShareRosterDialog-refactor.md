# ShareRosterDialog Refactoring Plan: Tanstack Query Integration

## Overview
This document outlines a step-by-step refactoring of `ShareRosterDialog.tsx` to use TanStack Query (React Query v5) for managing asynchronous operations. The plan is organized to complete one feature at a time, with the component remaining in a functional state after each step.

## Current State Analysis

### Current Implementation Issues
1. **Manual State Management**: Uses three separate `useState` hooks for tracking loading and success states
   - `downloading` - tracks image generation loading state
   - `copying` - tracks link sharing loading state
   - `copied` - tracks success feedback state
2. **Imperative Async Handling**: Direct `async/await` in event handlers with try/finally blocks
3. **No Built-in Error Handling**: Errors are silently ignored (no error display to user)
4. **Manual UI State Coordination**: Manually manages multiple state variables that should be coordinated
5. **No Built-in Retry Logic**: No automatic retry on failure

### Current Data Flow
```
User clicks button
  ↓
Event handler sets loading state to true
  ↓
Async function executes (image generation or API call)
  ↓
Completion/Error
  ↓
Set loading state to false
  ↓
For copy success: manually set `copied` state + setTimeout to reset
```

## Refactoring Strategy

The component has two distinct async operations:

1. **Download Image Feature** - A local operation using the `toJpeg` library
2. **Copy Share Link Feature** - A remote operation that calls `onShare()` and uses clipboard API

Each feature will be refactored independently using `useMutation` from TanStack Query. After each feature refactoring, the component will be fully functional with the other feature still using the old approach (until its turn).

---

## Step 1: Refactor Download Image Feature

**Goal**: Replace the `downloading` state and `handleDownloadImage` function with a `useMutation` for the image download operation.

### 1.1: Update Imports
Add the `useMutation` hook import:
```tsx
import { useMutation } from "@tanstack/react-query";
```

### 1.2: Create Download Mutation
Replace the `handleDownloadImage` function with a `useMutation` hook. Add this after the component props destructuring and before remaining state:

```tsx
const downloadMutation = useMutation({
  mutationFn: async () => {
    const node = gridRef.current;
    if (!node) throw new Error("Grid reference not found");

    const dataUrl = await toJpeg(node, {
      backgroundColor: "#0a0a0a",
      quality: 0.85,
      pixelRatio: 1,
      cacheBust: false,
    });

    // Trigger download
    const link = document.createElement("a");
    link.download = "tacticus-roster.jpg";
    link.href = dataUrl;
    link.click();

    return dataUrl;
  },
  onError: (error) => {
    console.error("Failed to download image:", error);
  },
});
```

### 1.3: Remove Download-Related State
Delete this line:
```tsx
const [downloading, setDownloading] = useState(false);
```

Keep the other two state variables for now:
```tsx
const [copying, setCopying] = useState(false);
const [copied, setCopied] = useState(false);
```

### 1.4: Create Download Handler
Create a simple handler that calls the mutation:
```tsx
const handleDownloadImage = () => {
  downloadMutation.mutate();
};
```

### 1.5: Update Download Button
Replace the Download button JSX to use `downloadMutation.isPending`:

```tsx
<Button
  variant="outline"
  onClick={handleDownloadImage}
  disabled={downloadMutation.isPending}
  className="justify-start"
>
  {downloadMutation.isPending ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Download className="size-4" />
  )}
  {downloadMutation.isPending ? "Generating image..." : "Download Image"}
</Button>
```

### 1.6: Verification
After completing Step 1:
- [ ] Component imports `useMutation`
- [ ] Download button displays correctly
- [ ] Clicking download shows loading spinner
- [ ] Image downloads when available
- [ ] Spinner disappears after download completes
- [ ] Copy link button still works as before (old implementation)

---

## Step 2: Refactor Copy Share Link Feature

**Goal**: Replace the `copying` and `copied` states with a `useMutation` for the share link operation.

### 2.1: Create Share Link Mutation
Add this mutation after the `downloadMutation`:

```tsx
const shareMutation = useMutation({
  mutationFn: async () => {
    const token = await onShare();
    if (!token) throw new Error("Failed to generate share token");

    const url = `${window.location.origin}/shared/roster?token=${token}`;
    await navigator.clipboard.writeText(url);

    return url;
  },
  onSuccess: () => {
    // Show success feedback for 2 seconds
    setTimeout(() => {
      shareMutation.reset();
    }, 2000);
  },
  onError: (error) => {
    console.error("Failed to copy share link:", error);
  },
});
```

### 2.2: Remove Share-Related State
Delete these lines:
```tsx
const [copying, setCopying] = useState(false);
const [copied, setCopied] = useState(false);
```

Since we're no longer using any `useState`, you can also remove the import:
```tsx
// Remove: import { useState } from "react";
```

### 2.3: Create Share Handler
Create a simple handler that calls the mutation:
```tsx
const handleCopyLink = () => {
  shareMutation.mutate();
};
```

### 2.4: Update Copy Button
Replace the Copy button JSX to use `shareMutation` states:

```tsx
<Button
  variant="outline"
  onClick={handleCopyLink}
  disabled={shareMutation.isPending}
  className="justify-start"
>
  {shareMutation.isSuccess ? (
    <Check className="size-4" />
  ) : (
    <Copy className="size-4" />
  )}
  {shareMutation.isSuccess ? "Link Copied!" : "Copy Share Link"}
</Button>
```

### 2.5: Verification
After completing Step 2:
- [ ] Component no longer uses `useState`
- [ ] Component only imports what it needs
- [ ] Copy button displays correctly
- [ ] Clicking copy shows loading spinner
- [ ] API call completes and link is copied to clipboard
- [ ] "Link Copied!" message appears and disappears after 2 seconds
- [ ] Download button still works as before
- [ ] Both mutations handle errors gracefully

---

## Step 3: Add Error Handling Display (Optional Enhancement)

**Goal**: Display user-friendly error messages when mutations fail.

### 3.1: Add Error Messages to Dialog
Add error display sections to the dialog content, after the button group:

```tsx
<div className="flex flex-col gap-2">
  {/* Existing buttons go here */}
</div>

{downloadMutation.isError && (
  <div className="text-sm text-red-500 mt-4">
    Failed to download image: {downloadMutation.error?.message}
  </div>
)}

{shareMutation.isError && (
  <div className="text-sm text-red-500 mt-4">
    Failed to copy share link: {shareMutation.error?.message}
  </div>
)}
```

### 3.2: Verification
After completing Step 3:
- [ ] Error messages appear when mutations fail
- [ ] Error messages are user-readable
- [ ] Error messages disappear on next attempt
- [ ] Both features continue to work correctly

---

## Step 4: Extract Mutations to Custom Hook (Optional Refactoring)

**Goal**: Move mutation logic to a reusable custom hook for better organization and testability.

### 4.1: Create Custom Hook File
Create a new file: `src/2-hooks/mutations/useRosterShare.ts`

```ts
import { useMutation } from "@tanstack/react-query";
import { toJpeg } from "html-to-image";

interface UseRosterShareProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  onShare: () => Promise<string | null>;
}

export function useRosterShare({ gridRef, onShare }: UseRosterShareProps) {
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const node = gridRef.current;
      if (!node) throw new Error("Grid reference not found");

      const dataUrl = await toJpeg(node, {
        backgroundColor: "#0a0a0a",
        quality: 0.85,
        pixelRatio: 1,
        cacheBust: false,
      });

      const link = document.createElement("a");
      link.download = "tacticus-roster.jpg";
      link.href = dataUrl;
      link.click();

      return dataUrl;
    },
    onError: (error) => {
      console.error("Failed to download image:", error);
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const token = await onShare();
      if (!token) throw new Error("Failed to generate share token");

      const url = `${window.location.origin}/shared/roster?token=${token}`;
      await navigator.clipboard.writeText(url);

      return url;
    },
    onSuccess: () => {
      setTimeout(() => {
        shareMutation.reset();
      }, 2000);
    },
    onError: (error) => {
      console.error("Failed to copy share link:", error);
    },
  });

  return { downloadMutation, shareMutation };
}
```

### 4.2: Update Component to Use Custom Hook
In `ShareRosterDialog.tsx`, replace all mutation definitions with:

```tsx
import { useRosterShare } from "@/2-hooks/mutations/useRosterShare";

export function ShareRosterDialog({
  gridRef,
  onShare,
}: ShareRosterDialogProps) {
  const { downloadMutation, shareMutation } = useRosterShare({
    gridRef,
    onShare,
  });

  const handleDownloadImage = () => {
    downloadMutation.mutate();
  };

  const handleCopyLink = () => {
    shareMutation.mutate();
  };

  // Rest of component remains the same...
}
```

### 4.3: Verification
After completing Step 4:
- [ ] Custom hook file is created and properly structured
- [ ] Component imports the custom hook
- [ ] Both mutations are initialized from the hook
- [ ] All features work exactly as before
- [ ] Code is better organized and more reusable
- [ ] Component is cleaner and easier to read

---

## Final Component Structure

After all steps, your `ShareRosterDialog.tsx` should look like:

```tsx
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { useRosterShare } from "@/2-hooks/mutations/useRosterShare";

interface ShareRosterDialogProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  onShare: () => Promise<string | null>;
}

export function ShareRosterDialog({
  gridRef,
  onShare,
}: ShareRosterDialogProps) {
  const { downloadMutation, shareMutation } = useRosterShare({
    gridRef,
    onShare,
  });

  const handleDownloadImage = () => {
    downloadMutation.mutate();
  };

  const handleCopyLink = () => {
    shareMutation.mutate();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Share Roster</AlertDialogTitle>
          <AlertDialogDescription>
            Download your roster as an image or share it via a public link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadImage}
            disabled={downloadMutation.isPending}
            className="justify-start"
          >
            {downloadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {downloadMutation.isPending ? "Generating image..." : "Download Image"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            disabled={shareMutation.isPending}
            className="justify-start"
          >
            {shareMutation.isSuccess ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {shareMutation.isSuccess ? "Link Copied!" : "Copy Share Link"}
          </Button>
        </div>

        {downloadMutation.isError && (
          <div className="text-sm text-red-500 mt-4">
            Failed to download image: {downloadMutation.error?.message}
          </div>
        )}

        {shareMutation.isError && (
          <div className="text-sm text-red-500 mt-4">
            Failed to copy share link: {shareMutation.error?.message}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Testing Checklist

### After Step 1 (Download Feature):
- [ ] Download button renders without errors
- [ ] Clicking download shows spinner
- [ ] Image downloads with correct name
- [ ] Spinner disappears after completion
- [ ] Copy link button still works (old code)

### After Step 2 (Copy Feature):
- [ ] Copy button renders without errors
- [ ] Clicking copy shows loading spinner
- [ ] Share link is copied to clipboard
- [ ] "Link Copied!" message appears and auto-dismisses
- [ ] Download button still works

### After Step 3 (Error Display):
- [ ] Error messages display when mutations fail
- [ ] Errors are user-friendly
- [ ] Both features continue working

### After Step 4 (Custom Hook):
- [ ] All previous functionality works
- [ ] Code is cleaner and more organized
- [ ] Hook is properly typed and exported

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **State Management** | 3 useState hooks | 0 useState hooks (all in mutations) |
| **Event Handlers** | Complex with try/catch | Simple one-liners |
| **Error Handling** | Silent/console only | Displayed to user |
| **Code Organization** | All in component | Custom hook extracted |
| **Type Safety** | Basic | Full with custom hook |
| **Testability** | Hard to test | Easy to test mutations independently |

---

## Benefits of This Refactoring

1. **Reduced Boilerplate**: Eliminates 3 useState hooks and associated logic
2. **Built-in Error Handling**: Automatic error state management with display
3. **Better UX**: Proper loading states and user feedback
4. **Testability**: Mutations are easier to mock and test
5. **Maintainability**: Follows React ecosystem best practices
6. **Reusability**: Custom hook can be used in other components
7. **Type Safety**: Better TypeScript support with dedicated hook file
8. **Single Source of Truth**: All async state in dedicated mutations

---

## Migration Complexity: Low ✅

- No breaking changes to component API
- No changes to parent component usage
- Can be done incrementally (complete one step at a time)
- Component remains functional after each step
- Easy to rollback if needed

---

## References

- TanStack Query Mutations: https://tanstack.com/query/v5/docs/framework/react/guides/mutations
- TanStack Query Queries: https://tanstack.com/query/v5/docs/framework/react/guides/queries
- React Hooks Best Practices: https://react.dev/reference/react