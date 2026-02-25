# `Symb0l` Ecosystem

This repository is a monorepo containing the `Symb0l` financial instrument database and its associated services.

> **Note**: The name `Symb0l` should always be written in monospace font with a slashed zero (Ø) to distinguish it from the letter O.

## Workspace Structure

- **[Core Database Engine](packages/core/README.md)** (`@symb0l/core`): The heart of the system. Manage SQLite database, schemas, and seeds.
- **[API Service](apps/api/README.md)** (`apps/api`): REST API for querying quotes and checking instrument metadata.

## Documentation

- **[Contribution Guidelines](AGENTS.md)**: Context and operating rules for human and AI contributors.
- **[Contributing Guide](CONTRIBUTING.md)**: Branch/worktree workflow and contributor checklist.

## Development

### Prerequisites

- Node.js (managed via mise)
- pnpm (managed via mise)
- [mise](https://mise.jdx.dev/) (optional, for environment management)

### Installation

Using `mise` to install the correct Node.js and pnpm versions:

```bash
mise install
pnpm install
```

If not using `mise`, ensure you have Node.js and pnpm installed manually.

### Worktree Workflow

Use git worktrees for feature work (recommended):

```bash
git worktree add -b feature/<name> .worktrees/feature-<name> main
cd .worktrees/feature-<name>
```

For required bootstrap steps and branch conventions, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Getting Started

To start the application in development mode:

```bash
pnpm dev
```

To build and start the application:

```bash
pnpm build
pnpm start
```

### Testing

This project uses Node.js 24's native test runner (`node:test`) for zero-dependency testing.

#### Run all tests

```bash
mise exec -- pnpm test
```

#### Run tests in watch mode

Automatically re-run tests when files change:

```bash
mise exec -- pnpm test:watch
```

#### Generate test coverage

```bash
mise exec -- pnpm test:coverage
```

## Pre-commit Hooks

This project uses [lefthook](https://github.com/evilmartians/lefthook) for automated pre-commit checks.

### Automatic Setup

Hooks are automatically installed when you run `pnpm install` (via the `prepare` script).

### What Runs on Commit

Before each commit, the following checks run in parallel:

- **Diagram compilation:** `pnpm --filter @symb0l/core compile-diagrams` - Keeps generated SVG docs in sync
- **Type checking:** `tsc --noEmit` - Catches TypeScript errors
- **Workspace build:** `pnpm -r build` - Detects TS/package build regressions

Integration tests run on pre-push:
- **Integration tests:** `pnpm test:integration`

### Local Overrides

Create a `lefthook-local.yml` file (gitignored) for local hook customizations.

## License

Dual-licensed under MIT or Apache 2.0.

## `symb0l` invaders

![`symb0l` invaders](game.gif)
