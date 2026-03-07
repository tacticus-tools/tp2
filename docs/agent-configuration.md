# Agent Configuration Philosophy

## Why Our Configuration Is Minimal

Recent research ([Gloaguen et al., 2026](https://arxiv.org/html/2602.11988v1) and [Lulla et al., 2026](https://arxiv.org/html/2601.20404v1)) evaluated how context files affect AI coding agents:

- **Detailed context files reduce task success** by ~3% while increasing costs by 20%+
- **Minimal files increase efficiency** by reducing unnecessary exploration
- **Agents follow instructions reliably**, so every instruction should be essential
- **Overviews don't help agents find files faster** — they just add noise

Our approach uses **deterministic rules (Claude Hooks) + minimal documentation** instead of verbose guidance.

## Configuration Strategy

### What Works
1. **Hard constraints** enforced as code (hooks) — prevent breaking changes
2. **Setup commands** — what to run to get started
3. **Minimal code patterns** — complete working examples only
4. **Links to documentation** — agents self-serve detailed info

### What Doesn't Work
- Lengthy explanations (increases token cost without improving outcomes)
- Architecture overviews (agents don't use them to navigate faster)
- Detailed troubleshooting (encourages exploration instead of focus)
- "Nice-to-know" information (dilutes critical guidance)

## How We Enforce Rules

### Claude Hooks (Recommended)

We use [Claude Code hooks](https://code.claude.com/docs/en/hooks) configured in `.claude/settings.json` to enforce constraints **deterministically**.

**Why hooks over documentation:**
- Rules are enforced **at runtime**, not interpreted from text
- No token cost (not sent with every request)
- Can't be ignored or misunderstood
- Versioned and traceable in code

### Developer Tooling

If using Claude Hooks isn't feasible, we can implement scripts that check for rule violations before allowing commits or builds. This ensures constraints are enforced without relying on agent interpretation.

Examples:
- Linting rules that prevent certain imports or patterns
- Formatting rules that enforce code structure
- Unit tests that fail if critical constraints are violated

### AGENTS.md (Minimal)

Our `/AGENTS.md` contains only:
- Setup commands
- Tech stack names
- Minimal code examples
- Links to documentation

Everything else is discoverable from code structure or docs.

Beyond that, only add to the AGENTS.md files after repeated agent failures due to missing information.
Even then, prefer adding hooks or tooling over verbose documentation.
Even after that, consider if the structure of the codebase is making it hard to find critical information.

## When to Update Configuration

### ✅ Do Update
- Critical setup command changes
- New constraints that prevent build failures
- Runtime switch (e.g., Bun → npm)
- Major architectural changes

### ❌ Don't Add
- Verbose explanations of how things work
- Project architecture overviews
- Troubleshooting guides
- "Best practices" or "tips"

## Resources for Developers

When revising agent configuration, you can point agents to these materials:

**Project Setup:**
- [tp2/AGENTS.md](../AGENTS.md) — minimal setup and rules
- [.claude/AGENTS.md](../.claude/AGENTS.md) — Claude Code hook configuration

**Technology Documentation:**
- [Convex Docs](https://docs.convex.dev/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Start](https://tanstack.com/start/latest)
- [Biome](https://biomejs.dev/)

**Research on Agent Context:**
- ["Evaluating AGENTS.md"](https://arxiv.org/html/2602.11988v1) — shows minimal context outperforms verbose
- ["Impact of AGENTS.md on Efficiency"](https://arxiv.org/html/2601.20404v1) — shows 28% time reduction with concise guidance
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks) — deterministic rule enforcement

## Summary

Effective agent configuration is **minimal, actionable, and deterministic**. We tell agents:
- **What to run** (setup commands)
- **What not to do** (hard rules enforced as code)
- **Where to learn more** (documentation links)

Then we let code structure and official documentation do the rest.
