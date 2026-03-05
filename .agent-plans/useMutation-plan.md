# Refactoring Plan: useMutation from convex/react → @convex-dev/react-query

## Overview
The codebase currently uses `useMutation` directly from `convex/react` in multiple places. According to the TanStack Query pattern (https://docs.convex.dev/client/tanstack/tanstack-query/), all mutations should use the TanStack `useMutation` hook with `useConvexMutation` from `@convex-dev/react-query` as the `mutationFn`.

The key pattern is:
```typescript
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../convex/_generated/api";

const saveProgressMutation = useMutation({
  mutationFn: useConvexMutation(api.lre.saveProgress),
});
```

**Current Setup**: The app has `@convex-dev/react-query` v0.1.0 already installed, and TanStack Query is properly configured with a `ConvexQueryClient` in the main entry point.

---

## Files Requiring Refactoring

### 1. **src/0-routes/_authenticated/lre.tsx**
**Status**: ✅ REFACTORED  
**Mutations Found**: 4
- `saveProgressMutation` → `api.lre.saveProgress`
- `addTeamMutation` → `api.lre.addTeam`
- `updateTeamMutation` → `api.lre.updateTeam`
- `removeTeamMutation` → `api.lre.removeTeam`

**Current Pattern**:
```typescript
const saveProgressMutation = useMutation(api.lre.saveProgress);
const addTeamMutation = useMutation(api.lre.addTeam);
```

**Required Changes**:
- Change import from `import { useMutation } from "convex/react"` to `import { useMutation } from "@tanstack/react-query"`
- Add `import { useConvexMutation } from "@convex-dev/react-query"`
- Wrap each mutation with TanStack pattern:
  ```typescript
  const saveProgressMutation = useMutation({
    mutationFn: useConvexMutation(api.lre.saveProgress),
  });
  ```
- Update all invocations:
  - `void saveProgressMutation({ eventId, data })` → `saveProgressMutation.mutate({ eventId, data })`
  - `void addTeamMutation({ ... })` → `addTeamMutation.mutate({ ... })`
  - `void updateTeamMutation({ ... })` → `updateTeamMutation.mutate({ ... })`
  - `void removeTeamMutation({ ... })` → `removeTeamMutation.mutate({ ... })`

---

### 2. **src/0-routes/_authenticated/goals.tsx**
**Status**: ✅ REFACTORED  
**Mutations Found**: 4
- `removeGoal` → `api.goals.remove`
- `removeAllGoals` → `api.goals.removeAll`
- `updateGoal` → `api.goals.update`
- `reorderGoals` → `api.goals.reorder`

**Current Pattern**:
```typescript
const removeGoal = useMutation(api.goals.remove);
const removeAllGoals = useMutation(api.goals.removeAll);
const updateGoal = useMutation(api.goals.update);
const reorderGoals = useMutation(api.goals.reorder);
```

**Required Changes**:
- Change imports as noted above
- Wrap each mutation: `const removeGoal = useMutation({ mutationFn: useConvexMutation(api.goals.remove) })`
- Update all `void mutation(args)` calls to `mutation.mutate(args)`
- Update all `await mutation(args)` calls to `await mutation.mutateAsync(args)`

---

### 3. **src/0-routes/_authenticated/roster.tsx**
**Status**: ✅ REFACTORED  
**Mutations Found**: 1
- `shareRoster` → `api.roster.share`

**Current Pattern**:
```typescript
const shareRoster = useMutation(api.roster.share);
```

**Usage Pattern Note**: This mutation is awaited:
```typescript
const result = await shareRoster({ roster: JSON.stringify(roster) });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const shareRoster = useMutation({ mutationFn: useConvexMutation(api.roster.share) })`
- Update invocation to use `mutateAsync`: 
  ```typescript
  const result = await shareRoster.mutateAsync({ roster: JSON.stringify(roster) });
  ```

---

### 4. **src/0-routes/_authenticated/roster-snapshots.tsx**
**Status**: ✅ REFACTORED  
**Mutations Found**: 1
- `save` → `api.rosterSnapshots.save`

**Current Pattern**:
```typescript
const save = useMutation(api.rosterSnapshots.save);
```

**Usage Pattern**: Awaited in async handlers
```typescript
await save({ data: JSON.stringify(newState) });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const save = useMutation({ mutationFn: useConvexMutation(api.rosterSnapshots.save) })`
- Update all invocations: `await save.mutateAsync({ data: ... })`

---

### 5. **src/0-routes/_authenticated/gw-offense.tsx**
**Status**: ✅ REFACTORED  
**Mutations Found**: 1
- `saveGw` → `api.gwOffense.save`

**Current Pattern**:
```typescript
const saveGw = useMutation(api.gwOffense.save);
```

**Usage Pattern**: Awaited in async handlers
```typescript
await saveGw({ bfLevel, deployments, notes });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const saveGw = useMutation({ mutationFn: useConvexMutation(api.gwOffense.save) })`
- Update all invocations: `await saveGw.mutateAsync({ ... })`

---

### 6. **src/0-routes/_authenticated/teams.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 3
- `addTeam` → `api.teams.add`
- `updateTeam` → `api.teams.update`
- `removeTeam` → `api.teams.remove`

**Current Pattern**:
```typescript
const addTeam = useMutation(api.teams.add);
const updateTeam = useMutation(api.teams.update);
const removeTeam = useMutation(api.teams.remove);
```

**Usage Pattern**: Awaited in async handlers
```typescript
await addTeam({ name, characterIds, ... });
```

**Required Changes**:
- Change imports
- Wrap each mutation with TanStack pattern
- Update all invocations: `await addTeam.mutateAsync({ ... })`, etc.

---

### 7. **src/0-routes/_authenticated/settings.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 1
- `saveMutation` → `api.tacticus.credentials.save`

**Current Pattern**:
```typescript
const saveMutation = useMutation(api.tacticus.credentials.save);
```

**Usage Pattern**: Awaited with error handling
```typescript
await saveMutation({ tacticusUserId, playerApiKey, guildApiKey });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const saveMutation = useMutation({ mutationFn: useConvexMutation(api.tacticus.credentials.save) })`
- Update invocation: `await saveMutation.mutateAsync({ ... })`

---

### 8. **src/1-components/CampaignProgressSync.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 1
- `saveMutation` → `api.campaignProgress.save`

**Current Pattern**:
```typescript
const saveMutation = useMutation(api.campaignProgress.save);
```

**Usage Pattern**: Awaited in async IIFE
```typescript
void (async () => {
  try {
    await saveMutation({ data: serialized });
  } catch { /* ... */ }
})();
```

**Required Changes**:
- Change imports
- Wrap mutation: `const saveMutation = useMutation({ mutationFn: useConvexMutation(api.campaignProgress.save) })`
- Update invocation: `await saveMutation.mutateAsync({ data: serialized })`
- Note: This is a headless component with automatic syncing; ensure the mutation dependency in useEffect is correct

---

### 9. **src/1-components/ImportButton.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 1
- `importAll` → `api.import.importAll`

**Current Pattern**:
```typescript
const importAll = useMutation(api.import.importAll);
```

**Usage Pattern**: Awaited with error handling
```typescript
await importAll({ goals, campaignProgress, ... });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const importAll = useMutation({ mutationFn: useConvexMutation(api.import.importAll) })`
- Update invocation: `await importAll.mutateAsync({ ... })`

---

### 10. **src/1-components/goals/AddGoalDialog.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 1
- `addGoal` → `api.goals.add`

**Current Pattern**:
```typescript
const addGoal = useMutation(api.goals.add);
```

**Usage Pattern**: Awaited in form submission
```typescript
await addGoal({ goalId, type, unitId, ... });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const addGoal = useMutation({ mutationFn: useConvexMutation(api.goals.add) })`
- Update invocation: `await addGoal.mutateAsync({ ... })`

---

### 11. **src/1-components/goals/EditGoalDialog.tsx**
**Status**: ✅ REFACTORED
**Mutations Found**: 1
- `updateGoal` → `api.goals.update`

**Current Pattern**:
```typescript
const updateGoal = useMutation(api.goals.update);
```

**Usage Pattern**: Awaited in form submission
```typescript
await updateGoal({ goalId, ... });
```

**Required Changes**:
- Change imports
- Wrap mutation: `const updateGoal = useMutation({ mutationFn: useConvexMutation(api.goals.update) })`
- Update invocation: `await updateGoal.mutateAsync({ ... })`

---

## Summary

**Total Files**: 11  
**Total Mutations Refactored**: 18  
**Status**: ✅ ALL FILES REFACTORED
**Pattern Change**: Direct `useMutation(api.fn)` → `useMutation({ mutationFn: useConvexMutation(api.fn) })`  

### Key Points:
1. All files need import changes (remove `convex/react`, add `@tanstack/react-query` and `@convex-dev/react-query`)
2. Do NOT destructure the return value from `useMutation`. Access properties via the variable directly (e.g., `mutation.mutate()`, `mutation.mutateAsync()`, `mutation.isPending`)
3. All mutation invocations need updating:
   - `void mutation(args)` → `mutation.mutate(args)` (for fire-and-forget)
   - `await mutation(args)` → `await mutation.mutateAsync(args)` (for async/await)
4. State access pattern:
   - `mutation.isPending` (use the full mutation object, don't destructure)
   - Some files may access loading states that need verification

### Testing Strategy:
- Verify mutations trigger correctly after each refactor
- Check that pending/loading states work as expected
- Ensure error handling still functions
- Test that query invalidation still works if any mutations revalidate queries