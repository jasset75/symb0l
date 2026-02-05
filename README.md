# `Symb0l` Ecosystem

This repository is a monorepo containing the `Symb0l` financial instrument database and its associated services.

## Workspace Structure

- **[Core Database Engine](packages/core/README.md)** (`@symb0l/core`): The heart of the system. Manage SQLite database, schemas, and seeds.
- **[API Service](apps/api/README.md)** (`apps/api`): REST API for querying quotes and checking instrument metadata.

## Development

### Prerequisites

- Node.js (v24+)
- pnpm (v10+)
- [mise](https://mise.jdx.dev/) (recommended)

### Getting Started

```bash
# Install dependencies for all packages
pnpm install

# Run tests across the workspace
pnpm test

# Run core in dev mode
pnpm dev
```

## License

Dual-licensed under MIT or Apache 2.0.
