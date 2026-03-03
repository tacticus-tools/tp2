# Agent Plan: [Task Title]

**Created:** YYYY-MM-DD  
**Status:** In Progress  
**Last Updated:** YYYY-MM-DD

## High-Level Goal

[One sentence describing the outcome. Focus on *what* will be accomplished, not *how*.]

Example: "Modify the authentication system to support OAuth2 providers while maintaining backward compatibility."

## Success Criteria

- [ ] [Testable criterion 1 — must be verifiable, not subjective]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]
- [ ] `bun run build-ci` passes
- [ ] Changes committed to git with clear message

## Implementation Plan

### Step 1: [High-Level Step Title]

**Goal:** [What this step achieves — one atomic, committable unit]

**Reasoning:** [Why this step; dependencies on prior steps]

**Substeps:**
1. [Concrete action]
2. [Concrete action]
3. [Concrete action]

**Success Indicator:** [How you'll verify completion — testable]

**Commit:** `git commit -m 'feat: [what changed]'` (or `fix:`, `refactor:`, etc.)

**Progress:** ⬜ Not started

---

## Example: Add OAuth2 Support

This example shows how to structure an atomic, committable step.

### Step 1: Create OAuth2 provider configuration

**Goal:** Add Convex schema and config for OAuth2 providers (Google, GitHub, etc.)

**Reasoning:** Configuration is foundational; everything else depends on it. Small, reviewable change.

**Substeps:**
1. Define OAuth2 provider type in `convex/schema.ts`
2. Add config loader in `convex/auth.ts`
3. Add environment variables to `.env.example`

**Success Indicator:**
- [ ] `convex/schema.ts` has OAuth2 config type
- [ ] `convex/auth.ts` loads provider config
- [ ] `.env.example` documents required env vars
- [ ] `bun run build-ci` passes

**Commit:** `git commit -m 'feat: Add OAuth2 provider configuration schema'`

**Progress:** ⬜ Not started

---

## Notes & Decisions

[Document key decisions, blockers, and context for future agents.]

Example:
- Decided to use Convex's built-in auth hooks rather than custom middleware (reduces maintenance)
- Blocker: OAuth provider documentation unclear on scope permissions (consulted Convex community)
- X library has known issue with Y; use workaround Z

## References

[Links to relevant documentation, issues, previous PRs, or research papers]

---

**To use:** Copy this file to `.agent-plans/[your-task-name].md` and fill in sections above. Each step is one atomic commit. Add more steps by copying the Step 1 template. Progress symbols: ⬜ Not started, 🟦 In progress, ✅ Complete.