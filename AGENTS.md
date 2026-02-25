# AGENTS.md

Compact operating spec for any AI/human agent in this repository.

## 1) Scope and Priority
- Scope: whole repo unless a deeper `AGENTS.md` exists in a subdirectory.
- Priority order:
  1. Direct user request.
  2. This file.
  3. Local conventions/tooling.
- Keep responses and edits minimal, explicit, and verifiable.

## 1.1) Linked Normative Docs (Must Follow)
- `CONTRIBUTING.md` is normative for contributor workflow (branches, worktrees, bootstrap, PR checks) for both humans and AI agents.
- For API work in `apps/api`, follow `apps/api/ARCHITECTURE.md`.
- For core DB work in `packages/core`, follow `packages/core/doc/DATABASE.md` and `packages/core/doc/DIAGRAMS.md`.

## 2) Project Snapshot
- Project: `Symb0l` (financial instruments/symbols DB).
- Stack: TypeScript + Node.js (`mise`) + SQLite (`node:sqlite`) + `pnpm`.
- Main areas:
  - `packages/core/src/` core logic
  - `packages/core/src/db.ts` schema/DB connection
  - `packages/core/doc/diagrams/` PlantUML `.puml`
  - `packages/core/doc/images/` generated `.svg`
  - `apps/api/` Fastify API (see `apps/api/ARCHITECTURE.md`)

## 3) Mandatory Style Rules
- Use `const` by default; `let` only if reassignment is required.
- Use `===` and `!==`.
- Use double quotes.
- End statements with semicolons.
- Prefer `node:test` for tests.

## 4) Standard Setup and Validation
```bash
mise install
pnpm install
pnpm test
```

## 5) High-Impact Workflows

### 5.1 DB Schema or Model Changes
If `packages/core/src/db.ts` changes:
1. Update matching PlantUML in `packages/core/doc/diagrams/`.
2. Run `pnpm run compile-diagrams`.
3. Confirm generated SVG in `packages/core/doc/images/` is current and referenced docs still render.

### 5.2 Seed Data Changes
Seed system:
- Builder: `packages/core/src/seeds/lib/SeederBuilder.ts`
- Orchestrator: `packages/core/src/seeds/index.ts`
- Data: `packages/core/src/seeds/*.ts`
- Integration tests: `packages/core/src/seeds/*.integration.test.ts`

Rules:
- Seed in dependency order (parent tables before child tables).
- Use idempotent inserts (`INSERT OR REPLACE`).
- Keep foreign keys enabled (`PRAGMA foreign_keys = ON;`).
- Keep types explicit (`SeederBuilder<typeof data[number]>(db)`).
- Add/adjust integration tests for each seed entity changed.

Validation:
```bash
pnpm test:integration
pnpm seed
```

### 5.3 API Changes (Fastify + Autoload)
- DI instances: `apps/api/src/infrastructure/di/container.ts`
- Fastify decorations: `apps/api/src/plugins/di.plugin.ts`
- Fastify type defs: `apps/api/src/types/fastify.d.ts`
- Route orchestration: `apps/api/src/plugins/routes.plugin.ts`

Rules:
- Do not manually wire everything in `app.ts`.
- Initialization plugins must declare dependency order via `fp(..., { dependencies: [...] })` when required.
- New endpoints must be registered through versioned route orchestration.

## 6) Worktree-First Git Workflow
Use worktrees for feature work; avoid switching main workspace branch.

Branch naming:
- `feature/<name>`
- `fix/<name>`
- `chore/<name>`

Create:
```bash
git worktree add -b feature/<name> .worktrees/feature-<name> main
```

Bootstrap in new worktree:
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

## 7) Diagram Tooling Requirements
For PlantUML compilation, ensure root `.env` defines:
```bash
JAVA_BIN=/path/to/java
PLANTUML_HOME=/path/to/plantuml.jar
```

## 8) Done Criteria (Before Hand-off)
- Relevant tests pass for changed area.
- Generated artifacts updated when required (e.g., diagrams).
- No unrelated file changes introduced.
- Short change summary + explicit verification commands run.

## 9) Token-Minimization Rules for Agents
- Prefer file references over long inline examples.
- Do not restate architecture already documented in code/docs.
- Ask only blocking questions; otherwise make reasonable assumptions and proceed.
- Return concise outputs: findings, edits, verification, next step.
