# Symb0l Core

`Symb0l` is a lightweight financial instrument and symbol database management system built with Node.js and SQLite. It provides a structured schema for normalizing and storing data related to exchanges, markets, instruments, listings, and currencies.

## Features

- **SQLite Database**: Uses `node:sqlite` (Node.js built-in module) for fast and reliable local data storage. Although `node:sqlite` is still somewhat immature, this design decision was made to eliminate third-party dependencies and bet on native Node.js support.
- **Normalized Schema**:
  - `exchange`: Stores exchange details.
  - `market`: Represents markets within exchanges.
  - `instrument`: Base definition of financial instruments (ISIN, name, type).
  - `listing`: Links instruments to markets with specific symbols and tickers.
  - `currency`: Reference table for currencies.
- **TypeScript**: Written in TypeScript for type safety and modern tooling.

## Data Model

![Data Model](doc/images/data_model.svg)

## Documentation

- [Database Management](doc/DATABASE.md) - Schema, seeds, and development workflow
- [Testing Guide](doc/TESTING.md) - Unit and integration testing

## Project Structure

- `src/index.ts`: Entry point of the application.
- `src/db.ts`: Database connection and schema initialization.
- `src/db.test.ts`: Database unit tests.
- `src/index.test.ts`: Application entry point tests.
- `symb0l.db`: SQLite database file (created on first run).
