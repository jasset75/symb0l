# AGENTS.md

This file provides **LLM-first** context and operating rules for AI agents working on this codebase. Clarity and explicitness are intentional.

---

## 🏗️ Project Context (Quick Overview)

- **Project**: `Symb0l` - Financial instrument and symbol database management.
- **Runtime**: Node.js (via `mise`).
- **Database**: SQLite (`node:sqlite`).
- **Language**: TypeScript.
- **Dependency Manager**: `pnpm` (installed and managed via `mise`).
- **Source Layout**:
  - `src/` → Source code (TS).
  - `src/db.ts` → Database schema and connection.
  - `doc/diagrams/` → PlantUML source files (`.puml`).
  - `doc/images/` → Generated diagrams (`.svg`).

---

## 🚀 Quick Start (Read This First)

1. Install dependencies:
   ```bash
   mise install
   pnpm install
   ```
2. Run tests to verify environment:
   ```bash
   pnpm test
   ```

---

## 🎨 Code Style & Standards

### Hard Rules (MUST)

- ✅ Use `const` by default; `let` only when reassignment is required.
- ✅ Always use strict equality (`===`).
- ✅ Double quotes (`"`) only.
- ✅ Semicolons are mandatory.
- ✅ Prefer `node:test` for testing.

---

## 📊 Diagram Compilation

We use **PlantUML** for documenting the database schema and architecture.

### Setup

1. **Environment Variables**:
   Create a `.env` file in the project root with the following variables:

   ```bash
   JAVA_BIN=/path/to/java
   PLANTUML_HOME=/path/to/plantuml.jar
   ```

   _Note: Ensure `plantuml.jar` exists at the specified path._

2. **Source Files**:
   - Place `.puml` files in `doc/diagrams/`.
   - Naming convention: `snake_case.puml`.

3. **Compilation**:
   - Run `pnpm run compile-diagrams`.
   - The script `src/tools/compile-diagrams.ts` will compile modified `.puml` files to `.svg` in `doc/images/`.

### Automation

- **Pre-commit Hook**:
  - `lefthook` is configured to run `pnpm run compile-diagrams` automatically before every commit.
  - This ensures documentation (SVGs) remains in sync with the source (`.puml`).

### Working with Diagrams

When modifying the database schema (`src/db.ts`), you **MUST**:

1. Update the corresponding `.puml` file in `doc/diagrams/` (e.g., `data_model.puml`).
2. Run `pnpm run compile-diagrams` to generate the updated SVG.
3. Verify the SVG is correctly embedded in `README.md` or other documentation.

---

## 🌱 Database Seeding System

We use a **generic seeder pattern** to populate master data tables. This approach ensures consistency, type safety, and maintainability.

### Architecture

The seeding system consists of:

1. **Generic Seeder** (`src/seeds/seeder.ts`): Reusable seeding logic
2. **Seed Data Files** (`src/seeds/*.ts`): Master data definitions
3. **Seed Orchestrator** (`src/seeds/index.ts`): Coordinates seeding order
4. **Integration Tests** (`src/seeds/*.integration.test.ts`): Validates seed data

### SeederBuilder Pattern

The seeding system uses the **Builder Pattern** via the `SeederBuilder` class, providing a fluent API for database seeding with automatic foreign key resolution.

**Key Benefits:**

- Single import - no need to import separate `seed` and `resolveForeignKey` functions
- Fluent, expressive API
- Clear class-level responsibilities
- Type-safe with generics
- Encapsulated foreign key resolution

### Adding a New Seed

Follow these steps to add a new seed entity:

#### 1. Create the Seed Data File

Create `src/seeds/[entity].ts` with your master data. See [`src/seeds/exchanges.ts`](file:///Users/juan/work/symb0l/src/seeds/exchanges.ts) or [`src/seeds/markets.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.ts) as templates.

#### 2. Add to Seed Orchestrator

Edit [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts):

**Simple case (no foreign keys)**:

```typescript
import { SeederBuilder } from "./lib/SeederBuilder.js";

new SeederBuilder<(typeof exchanges)[number]>(db)
  .entity("exchanges")
  .sql("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)")
  .data(exchanges)
  .mapToValues((exchange) => [exchange.code, exchange.name])
  .seed();
```

**Complex case (with foreign keys)**:

```typescript
new SeederBuilder<(typeof markets)[number]>(db)
  .entity("markets")
  .sql("INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)")
  .data(markets)
  .resolveForeignKey(
    "exchange_id",
    "exchange",
    "exchange_id",
    "code",
    (market) => market.exchange_code
  )
  .mapToValues((market) => [
    (market as unknown as Record<string, number>).exchange_id,
    market.code,
    market.name,
  ])
  .seed();
```

**Multiple foreign keys**:

```typescript
new SeederBuilder<(typeof items)[number]>(db)
  .entity("items")
  .sql("INSERT OR REPLACE INTO item (code, category_id, region_id) VALUES (?, ?, ?)")
  .data(items)
  .resolveForeignKey("category_id", "category", "id", "code", (item) => item.categoryCode)
  .resolveForeignKey("region_id", "region", "id", "code", (item) => item.regionCode)
  .mapToValues((item) => [
    item.code,
    (item as unknown as Record<string, number>).category_id,
    (item as unknown as Record<string, number>).region_id,
  ])
  .seed();
```

#### 3. Create Integration Tests

Create `src/seeds/[entity].integration.test.ts`. Use these as templates:

- [`src/seeds/exchanges.integration.test.ts`](file:///Users/juan/work/symb0l/src/seeds/exchanges.integration.test.ts) - Simple entity
- [`src/seeds/markets.integration.test.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.integration.test.ts) - Entity with foreign keys

#### 4. Verify

```bash
pnpm test:integration  # All tests should pass
pnpm seed              # Verify seeding works
```

### Best Practices

1. **Order Matters**: Seed entities in dependency order (parents before children)
2. **Idempotency**: Use `INSERT OR REPLACE` to make seeds idempotent
3. **Foreign Keys**: Enable with `PRAGMA foreign_keys = ON;`
4. **Type Safety**: Always specify the generic type parameter: `SeederBuilder<typeof data[number]>(db)`
5. **Testing**: Write integration tests for every seed entity
6. **Documentation**: Add JSDoc comments explaining the entity's purpose

### Reference Implementation

See the complete implementation:

- **SeederBuilder**: [`src/seeds/lib/SeederBuilder.ts`](file:///Users/juan/work/symb0l/src/seeds/lib/SeederBuilder.ts)
- **Data**: [`src/seeds/markets.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.ts)
- **Seeding**: [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts) (markets section)
- **Tests**: [`src/seeds/markets.integration.test.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.integration.test.ts)
- **Unit Tests**: [`src/seeds/lib/SeederBuilder.test.ts`](file:///Users/juan/work/symb0l/src/seeds/lib/SeederBuilder.test.ts)

---

## 🌿 Branch & Worktree Workflow

To keep the workspace clean and avoid switching branches in the main directory, we use **Git Worktrees** for feature development.

### Branch Naming Convention

- **Features**: `feature/<name>` (e.g., `feature/add-iperionx`)
- **Fixes**: `fix/<name>`
- **Chore**: `chore/<name>`

### Workflow

1. **Create a Worktree**:
   Create a new worktree in the `.worktrees/` directory (which is gitignored).

   ```bash
   # Syntax: git worktree add -b <branch-name> .worktrees/<folder-name> <base-branch>
   git worktree add -b feature/add-new-data .worktrees/feature-add-new-data main
   ```

2. **Switch Context**:
   Open the worktree in your editor or navigate to it in the terminal.

   ```bash
   cd .worktrees/feature-add-new-data
   ```

3. **Develop & Commit**:
   Make your changes, run tests, and commit as usual within the worktree.

4. **Cleanup**:
   Once the PR is merged, remove the worktree.

   ```bash
   git worktree remove .worktrees/feature-add-new-data
   ```

### Agent & Editor Workflow

When using worktrees, treat each worktree as a **separate workspace**.

- **IDE/Editor**: Open the worktree folder (e.g., `.worktrees/feature-add-new-data`) as a **separate window**.
  - **Why?**: If you open the main folder, the IDE indexes both the main `node_modules` and the worktree's `node_modules`, causing duplicate symbol errors and slow performance.
  - **Disk Usage**: `pnpm` uses a global content-addressable store, so the physical `node_modules` files in worktrees share disk space with the main project (hard links), minimizing overhead.
- **AI Agents**: Point the agent to the worktree directory as the **workspace root**. This ensures the agent acts on the correct files and git context.
