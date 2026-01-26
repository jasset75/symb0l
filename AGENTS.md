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
   *Note: Ensure `plantuml.jar` exists at the specified path.*

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
