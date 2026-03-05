# Agent Plan: Planning Mode Infrastructure with Claude Code Hooks

**Created:** 2025-01-24  
**Status:** Complete ✅  
**Last Updated:** 2025-01-27

## High-Level Goal

Implement planning infrastructure with Claude Code hooks that encourages agents to start every task with explicit planning, track progress step-by-step, and commit plans to git for continuity and team learning.

## Success Criteria

- [x] `.claude/settings.json` updated with `sessionStart`, `afterAgentThought`, and `afterAgentResponse` hooks
- [x] `.agent-plans/_template.md` created with working plan structure
- [x] `.agent-plans/README.md` created with minimal documentation
- [x] Plan naming convention uses `[task-name].md` pattern (not `CURRENT.md`) for multi-agent parallel work
- [x] All files follow Plan-and-Act and Ralph Loop research principles
- [x] `bun run build-ci` passes
- [x] Changes committed to git with clear message

## Implementation Plan

### Step 1: Update `.claude/settings.json` with Planning Hooks

**Goal:** Add three new hooks to enforce planning practices at session start, after thought, and after response.

**Reasoning:** Hooks are deterministic rules enforced as code; they ensure planning discipline without context overhead. Named plan files (`[task-name].md` pattern) enable parallel multi-agent work without git conflicts.

**Substeps:**
1. Add `sessionStart` hook requiring reading/creating named plan files matching `[task-name].md` pattern
2. Add `afterAgentThought` hook that prompts progress updates to preserve context across rotations
3. Add `afterAgentResponse` hook that suggests checklist completion and commit workflow
4. Preserve existing PreToolUse/PostToolUse rules
5. Validate JSON syntax with `node -e "require('./.claude/settings.json')"`

**Success Indicator:**
- [x] Settings file loads without errors
- [x] All three hooks properly formatted and present
- [x] Hooks reference named plans, not `CURRENT.md`
- [x] JSON syntax is valid

**Commit:** `git commit -m 'feat: Add planning mode hooks to Claude Code settings'`

**Progress:** ✅ Complete

---

### Step 2: Create `.agent-plans/_template.md`

**Goal:** Provide a minimal, working template that teaches good planning through structure rather than prose.

**Reasoning:** Templates teach implicitly through form; minimal explanatory text reduces context bloat. Template must be copy-paste ready and demonstrate all required sections (Goal, Success Criteria, Implementation Plan with reasoning).

**Substeps:**
1. Structure with High-Level Goal, Success Criteria (checklist), Implementation Plan (steps with reasoning)
2. Each step includes: Goal statement, Reasoning, Substeps (logical grouping), Success Indicator, Commit message, Progress symbol
3. Add Notes & Decisions section for documenting key choices and blockers
4. Add References section for documentation links
5. Include file naming guidance (kebab-case, be specific)
6. Include example step showing full structure
7. Reduce instructional text to bare minimum; keep template under 400 lines

**Success Indicator:**
- [x] Template is clear and complete
- [x] Template is copy-paste ready for any task type
- [x] All required sections present (Goal, Success Criteria, Steps, Notes, References)
- [x] Example step demonstrates full structure

**Commit:** `git commit -m 'docs: Create planning template with structured step format'`

**Progress:** ✅ Complete

---

### Step 3: Create `.agent-plans/README.md`

**Goal:** Document directory purpose, naming conventions, and multi-agent handoff patterns without prescriptive guidance.

**Reasoning:** README explains *what* the infrastructure does, not *how* to use it. Naming conventions enable parallel work; git history enables context rotation. Keep documentation under 300 words to reduce context bloat.

**Substeps:**
1. Explain purpose: Named plan files (`[task-name].md`), `_template.md`, historical plans
2. Document naming conventions for different task types (features, fixes, refactors, additions)
3. Explain multi-agent work: Different agents work on different named files in parallel
4. Show how fresh agents can leverage git history and previous plans
5. Link to academic foundation (Plan-and-Act, Ralph Loop papers)
6. Keep to ~300 words; focus on mechanics, not best practices
7. Mention that hooks enforce structure automatically

**Success Indicator:**
- [x] README documents named file purposes
- [x] Naming conventions are clear
- [x] Multi-agent parallel work is explained
- [x] Documentation is minimal and practical (< 300 words)
- [x] Research foundation is referenced

**Commit:** `git commit -m 'docs: Add planning directory README with conventions and research foundation'`

**Progress:** ✅ Complete

---

### Step 4: Document This Task in `.agent-plans/agent-planning-integration.md`

**Goal:** Create this plan file as both task documentation and working example of the template structure.

**Reasoning:** Self-referential example demonstrates the naming convention and template structure in practice. This file serves as reference for future agents tackling infrastructure tasks. Progress tracking shows how to manage context rotations.

**Substeps:**
1. Name file `agent-planning-integration.md` to demonstrate kebab-case naming convention
2. Structure using template format with all sections (Goal, Success Criteria, Steps with Reasoning, Notes, References)
3. Break task into logical, atomic, committable steps
4. Add detailed reasoning for each step explaining *why* and dependencies
5. Include testable success indicators for each step
6. Update progress tracking as work completes (⬜ ⟶ 🟦 ⟶ ✅)
7. Add Notes & Decisions section documenting key design choices

**Success Indicator:**
- [x] File follows template structure exactly
- [x] All steps include reasoning and success indicators
- [x] Progress tracked with symbols (⬜ 🟦 ✅)
- [x] File demonstrates multi-agent naming convention
- [x] File serves as usable example for future tasks

**Commit:** `git commit -m 'docs: Document planning infrastructure task with progress tracking'`

**Progress:** ✅ Complete

---

### Step 5: Validate and Commit All Changes

**Goal:** Verify all changes work correctly and commit to git.

**Reasoning:** Validation ensures configuration is correct and doesn't break existing functionality. Git commit creates immutable record and enables context rotation via git history.

**Substeps:**
1. Verify JSON syntax in `.claude/settings.json` with `node -e "require('./.claude/settings.json')"`
2. Verify all hooks properly formatted and present (three hooks: sessionStart, afterAgentThought, afterAgentResponse)
3. Verify no `CURRENT.md` references remain in codebase
4. Verify all new plan files exist and use `[task-name].md` naming convention
5. Run `bun run build-ci` to ensure no build errors
6. Stage all changes: `.agent-plans/` directory and `.claude/settings.json`
7. Commit with message: `git commit -m 'feat: Add planning mode infrastructure with Claude Code hooks and multi-agent support'`
8. Verify commit is in git log

**Success Indicator:**
- [x] `.claude/settings.json` has valid JSON syntax
- [x] All three hooks present and properly formatted
- [x] No `CURRENT.md` references in project
- [x] All three new files created: `_template.md`, `README.md`, `agent-planning-integration.md`
- [x] `bun run build-ci` passes
- [x] Changes committed to git with clear message
- [x] Commit visible in `git log`

**Commit:** `git commit -m 'feat: Add planning mode infrastructure with Claude Code hooks and multi-agent support'`

**Progress:** ✅ Complete

---

## Notes & Decisions

- **Hooks over documentation**: Hooks enforce discipline as code without context cost; minimal prose reduces token overhead
- **Named plans instead of CURRENT.md**: Enables multiple agents working on different tasks in parallel without git conflicts
- **Plan-and-Act foundation**: Dynamic replanning with externalized progress improves agent success; template enforces this structure
- **Ralph Loop principle**: Fresh context rotations work when progress is externalized in files and git history
- **Minimal template text**: Agents learn from structure (sections, required fields) rather than verbose guidance
- **Multi-agent naming**: Each task gets unique kebab-case filename (e.g., `auth-oauth2-integration.md`), preventing concurrent overwrites
- **Template as teaching tool**: Structure implicitly teaches separation of planning from execution, atomic commits, and reasoning documentation

## References

- [Plan-and-Act Papers](https://arxiv.org/abs/2305.04091) — Separate planning improves agent success by ~44%
- [Ralph Loop Research](https://arxiv.org/abs/2312.10003) — Context rotation with externalized progress enables long-horizon tasks
- [Claude Code Agent Configuration](https://docs.anthropic.com/en/docs/build-a-bot/agent-configuration) — Hook-based deterministic rules for agent behavior
- [TanStack Start Documentation](https://tanstack.com/start/latest) — Frontend framework documentation
- [Convex Documentation](https://docs.convex.dev/) — Backend framework and schema documentation
