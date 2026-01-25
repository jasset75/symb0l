# Symb0l

Symb0l is a lightweight financial instrument and symbol database management system built with Node.js and SQLite. It provides a structured schema for normalizing and storing data related to exchanges, markets, instruments, listings, and currencies.

## Features

- **SQLite Database**: Uses `better-sqlite3` for fast and reliable local data storage.
- **Normalized Schema**:
  - `exchange`: Stores exchange details.
  - `market`: Represents markets within exchanges.
  - `instrument`: Base definition of financial instruments (ISIN, name, type).
  - `listing`: Links instruments to markets with specific symbols and tickers.
  - `currency`: Reference table for currencies.
- **TypeScript**: Written in TypeScript for type safety and modern tooling.

## Prerequisites

- Node.js (managed via mise)
- pnpm (managed via mise)
- [mise](https://mise.jdx.dev/) (optional, for environment management)

## Installation

Using `mise` to install the correct Node.js and pnpm versions:

```bash
mise install
pnpm install
```

If not using `mise`, ensure you have Node.js and pnpm installed manually.

## Usage

### Development

To start the application in development mode with hot-reloading:

```bash
pnpm dev
```

### Production

To build and start the application:

```bash
pnpm build
pnpm start
```

## Project Structure

- `src/index.ts`: Entry point of the application.
- `src/db.ts`: Database connection and schema initialization.
- `symb0l.db`: SQLite database file (created on first run).
