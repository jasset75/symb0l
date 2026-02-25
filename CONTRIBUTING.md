# Contributing

Practical contributor workflow for this monorepo.

## Branch and Worktree Strategy

Use git worktrees for feature development to keep the main workspace clean.

Branch naming:
- `feature/<name>`
- `fix/<name>`
- `chore/<name>`

Create a worktree:

```bash
git worktree add -b feature/<name> .worktrees/feature-<name> main
cd .worktrees/feature-<name>
```

## Worktree Bootstrap (Required)

From the worktree root:

```bash
pnpm install
cp /path/to/main/workspace/packages/core/.env packages/core/.env
cp /path/to/main/workspace/apps/api/.env apps/api/.env
# fallback only if missing:
cp packages/core/.env.example packages/core/.env
cp apps/api/.env.example apps/api/.env
pnpm --filter @symb0l/core build
pnpm --filter symb0l-api build
pnpm seed
```

Operational rule:
- Open each worktree as a separate editor window/workspace root.

## Before Opening a PR

```bash
pnpm test
pnpm test:integration
pnpm build
```

Pre-commit and pre-push hooks run via `lefthook`; see the root `lefthook.yml` for exact checks.
