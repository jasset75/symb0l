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

- [mise](https://mise.jdx.dev/) — manages all tool versions (Node, Rust, just)
- [just](https://just.systems) — task runner (installed automatically via `mise install`)
- [pnpm](https://pnpm.io) — Node package manager

### Installation

Install all tools and Node dependencies in one step:

```bash
mise install   # installs Node, Rust, just
just install   # runs pnpm install
```

Or bootstrap everything at once:

```bash
just bootstrap
```

### Task Runner

All common actions are available via `just`. Run `just` (no arguments) to list them:

| Recipe | Description |
|--------|-------------|
| `just bootstrap` | Install tools (mise) + Node deps (pnpm) |
| `just dev` | Start API in background + TUI in foreground |
| `just api` | Start API in dev/watch mode only |
| `just build-all` | Build all artefacts (Node packages + TUI binary) |
| `just build` | Build Node packages only |
| `just tui-build` | Build TUI release binary |
| `just tui-install` | Install TUI binary to `~/.cargo/bin/symb0l-tui` |
| `just test` | Unit tests (Node + Rust) |
| `just test-all` | Unit + integration (Node) + Rust tests |
| `just test-integration` | Node integration tests only |
| `just db-reset` | Reset the database |
| `just db-seed` | Seed the database |
| `just lint` | Lint all packages |
| `just format` | Format all packages |
| `just diagrams` | Compile PlantUML diagrams to SVG |

### Worktree Workflow

Use git worktrees for feature work (recommended):

```bash
git worktree add -b feature/<name> .worktrees/feature-<name> main
cd .worktrees/feature-<name>
```

For required bootstrap steps and branch conventions, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Testing

This project uses Node.js 24's native test runner (`node:test`) for zero-dependency testing, and Rust's built-in `cargo test` for the TUI.

#### Run all unit tests

```bash
just test
```

#### Run all tests (unit + integration)

```bash
just test-all
```

## Pre-commit Hooks

This project uses [lefthook](https://github.com/evilmartians/lefthook) for automated pre-commit checks.

### Automatic Setup

Hooks are automatically installed when you run `pnpm install` (via the `prepare` script).

### What Runs on Commit

Before each commit, the following checks run in parallel:

- **Diagram compilation:** keeps generated SVG docs in sync
- **Type checking:** catches TypeScript errors
- **Workspace build:** detects TS/package build regressions

Integration tests run on pre-push:
- **Integration tests:** `just test-integration`

### Local Overrides

Create a `lefthook-local.yml` file (gitignored) for local hook customizations.

## License

Dual-licensed under MIT or Apache 2.0.

## `symb0l` invaders

![`symb0l` invaders](game.gif)
