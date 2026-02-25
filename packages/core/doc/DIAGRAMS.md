# Diagram Workflow (PlantUML)

## Prerequisites

Create a root `.env` with:

```bash
JAVA_BIN=/path/to/java
PLANTUML_HOME=/path/to/plantuml.jar
```

## Source and Output

- Source `.puml`: `packages/core/doc/diagrams/`
- Generated `.svg`: `packages/core/doc/images/`

Naming convention:

- Use `snake_case.puml`.

## Compile

```bash
pnpm --filter @symb0l/core compile-diagrams
```

This compiles modified diagrams to SVG.

## When It Is Mandatory

If you modify `packages/core/src/db.ts`:

1. Update the corresponding diagram `.puml` file.
2. Recompile diagrams.
3. Verify rendered SVG references in docs (for example `packages/core/README.md`) are still correct.

## Automation

The root `lefthook` pre-commit runs diagram compilation automatically.
