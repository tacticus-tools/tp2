# Claude Code Configuration

This project uses native Claude Code rules (in `.claude/settings.json`) to enforce constraints deterministically.

## Rules

| Rule | Action | Blocks |
|------|--------|--------|
| `forbid-npm` | Deny | npm, pnpm, yarn (use `bun` only) |
| `forbid-generated` | Deny | `src/routeTree.gen.ts`, `convex/_generated/`, `*.generated.*` |
| `forbid-sensitive` | Deny | `.git/`, `.env.local`, `.gitignore`, `.wrangler/` |
| `autoapprove-safe` | Allow | `bun fix`, `bun test`, `bun tsc`, `bun build-ci` |
| `format-after-edit` | Auto-run | `bun run format` after code changes |

## Extending

Edit `.claude/settings.json`:
- Add patterns to `rules[].patterns` array to block/allow more files or commands
- Add command patterns to `autoapprove-safe` to auto-approve more commands
- Restart Claude Code for changes to take effect

## Docs

- [Claude Code Configuration](https://code.claude.com/docs/en/configuration)
- [Agent Configuration Philosophy](../docs/agent-configuration.md)
- [Project Setup](../AGENTS.md)
