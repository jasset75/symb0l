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

### Generic Seeder Pattern

The `seed()` function accepts a configuration object:

```typescript
interface SeederConfig<T> {
  entityName: string; // For logging
  sql: string; // INSERT OR REPLACE statement
  data: T[]; // Array of seed data
  mapToValues: (item: T) => SqliteValue[]; // Maps object to SQL values
  transform?: (item: T) => T | Record<string, SqliteValue>; // Optional pre-processing
}
```

### Adding a New Seed

Follow these steps to add a new seed entity:

#### 1. Create the Seed Data File

Create `src/seeds/[entity].ts` with your master data. See [`src/seeds/exchanges.ts`](file:///Users/juan/work/symb0l/src/seeds/exchanges.ts) or [`src/seeds/markets.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.ts) as templates.

#### 2. Add to Seed Orchestrator

Edit `src/seeds/index.ts`:

**Simple case (no foreign keys)**: See `exchanges` or `currencies` in [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts)

**Complex case (with foreign keys)**: See `markets` in [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts)

- Use `resolveForeignKey(db, ...)` from [`src/seeds/lib/resolvers.ts`](file:///Users/juan/work/symb0l/src/seeds/lib/resolvers.ts)
- Signature: `resolveForeignKey(db, table, idColumn, whereColumn, whereValue)`
- The `db` instance is passed via dependency injection to avoid tight coupling

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
4. **Type Safety**: Always define TypeScript interfaces for seed data
5. **Testing**: Write integration tests for every seed entity
6. **Documentation**: Add JSDoc comments explaining the entity's purpose

### Reference Implementation

See the complete implementation of the markets seed (with foreign keys):

- Data: [`src/seeds/markets.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.ts)
- Seeding: [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts) (markets section)
- Tests: [`src/seeds/markets.integration.test.ts`](file:///Users/juan/work/symb0l/src/seeds/markets.integration.test.ts)
- Resolvers: [`src/seeds/lib/resolvers.ts`](file:///Users/juan/work/symb0l/src/seeds/lib/resolvers.ts)
