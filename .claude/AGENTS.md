# Claude Code Configuration

This project uses Claude Code project settings (in `.claude/settings.json`) to enforce constraints deterministically.

## Rules

| Rule | Action | Blocks |
|------|--------|--------|
| `forbid-npm` | Deny | npm, pnpm, yarn (use `bun` only) |
| `forbid-generated` | Deny | `src/routeTree.gen.ts`, `convex/_generated/`, `*.generated.*` |
| `forbid-sensitive` | Deny | `.git/`, `.env.local`, `.gitignore`, `.wrangler/` |
| `autoapprove-safe` | Allow | `bun fix`, `bun test`, `bun tsc`, `bun build-ci` |
| `formatting` | Auto-run | `bun run format` after code changes |

## Extending

Edit `.claude/settings.json`:
- Update `permissions.deny` and `permissions.allow` to block/allow additional commands or file patterns
- Keep commit actions gated for human review before running `git commit`
- Restart Claude Code for changes to take effect

## Docs

- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Agent Configuration Philosophy](../docs/agent-configuration.md)
- [Project Setup](../AGENTS.md)
