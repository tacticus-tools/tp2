# Agent Planning Directory

This directory contains task plans created by and for AI agents. Plans are **named files** (not `CURRENT.md`) so multiple agents can work in parallel without git conflicts.

## Purpose

- **Multiple agents** work on different tasks simultaneously (each has its own plan file)
- **Fresh agents** read the plan file and continue where the previous agent left off
- **Progress is permanent** — tracked in git, survives context rotation

## Files

### `[task-name].md` (Named Plans)

Each task gets its own file. Examples:
- `auth-oauth2-integration.md`
- `fix-payment-flow.md`
- `add-email-notifications.md`
- `refactor-database-migrations.md`

**Format:** High-level goal, success criteria (checklist), implementation steps, progress tracking, notes & decisions.

### `_template.md`

Reference structure for creating new plans.

### Historical Plans

Completed plans in git history show patterns and decisions from previous work.

## How to Use

### Starting a new task

1. Identify your task
2. Create `.agent-plans/[kebab-case-task-name].md`
3. Copy structure from `_template.md`
4. Fill in all sections
5. Commit: `git add .agent-plans/[task-name].md && git commit -m 'plan: [task name]'`
6. Execute and update progress as you go

### Continuing an existing task

1. Read `.agent-plans/[task-name].md`
2. Check progress tracking — see what's done, what's left
3. Continue from the next incomplete step
4. Update progress and commit frequently

### Multiple agents, parallel work

- Agent A: `auth-oauth2-integration.md`
- Agent B: `fix-payment-flow.md`
- Agent C: `add-email-notifications.md`

Each agent works independently. When context fills up, commit your progress so the next agent can pick up.

## Naming Conventions

| Pattern | Example |
|---------|---------|
| `[feature]-[component].md` | `auth-oauth2-integration.md` |
| `fix-[issue].md` | `fix-payment-flow.md` |
| `refactor-[area].md` | `refactor-database-migrations.md` |
| `add-[feature].md` | `add-email-notifications.md` |

Use kebab-case, be specific. Filename is the task identifier.

## Links

- [Plan-and-Act Research](https://arxiv.org/html/2503.09572v3)
- [Ralph Loop](https://dev.to/alexandergekov/2026-the-year-of-the-ralph-loop-agent-1gkj)
- [Agent Configuration Philosophy](../docs/agent-configuration.md)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks)