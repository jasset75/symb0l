# Database Management Guide

## Overview

`Symb0l` uses SQLite for local data storage with an idempotent seed system for master data management.

> [!NOTE]
> The name `Symb0l` should always be written in monospace font with a slashed zero (Ø) to distinguish it from the letter O.

## Database Structure

### Schema Location

- **Source**: [`src/db.ts`](file:///Users/juan/work/symb0l/src/db.ts) - Schema definition using `CREATE TABLE IF NOT EXISTS`
- **Database File**: `symb0l.db` - SQLite database (gitignored)

### Tables

#### Currency

Master data table for currency information.

| Column            | Type      | Description                                                                         |
| ----------------- | --------- | ----------------------------------------------------------------------------------- |
| `currency_id`     | TEXT (PK) | [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) numeric code (e.g., 840 for USD) |
| `name`            | TEXT      | Full currency name                                                                  |
| `code3`           | TEXT      | 3-letter ISO 4217 alphabetic code (USD, EUR, etc.)                                  |
| `code2`           | TEXT      | 2-letter country code                                                               |
| `currency_symbol` | TEXT      | Symbol representation ($, €, etc.)                                                  |
| `decimal_digits`  | INTEGER   | Number of decimal places (0 for JPY, 2 for most)                                    |

#### Country

Countries using ISO 3166-1 alpha-2 standard codes.

| Column         | Type      | Description                                    |
| -------------- | --------- | ---------------------------------------------- |
| `country_code` | TEXT (PK) | ISO 3166-1 alpha-2 code (e.g., US, ES, FR, JP) |
| `name`         | TEXT      | Full country name (e.g., "United States")      |

> [!NOTE]
> The country table uses ISO 3166-1 alpha-2 codes as the primary key for standardization and can be extended with additional metadata in the future (region, default currency, etc.).

#### Market

Trading venues identified by ISO 10383 Market Identifier Codes (MIC).

| Column          | Type         | Description                                                                                             |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| `market_id`     | INTEGER (PK) | Primary key                                                                                             |
| `mic_code`      | TEXT (UQ)    | [ISO 10383](https://www.iso20022.org/market-identifier-codes) Market Identifier Code (e.g., XNAS, XPAR) |
| `ticker_prefix` | TEXT         | Ticker prefix used by platforms like Google Finance (e.g., NASDAQ, BME, EPA)                            |
| `name`          | TEXT         | Short name (e.g., "NASDAQ", "Euronext")                                                                 |
| `title`         | TEXT         | Full descriptive name (e.g., "Nasdaq", "Euronext Paris")                                                |
| `country_code`  | TEXT (FK)    | ISO 3166-1 alpha-2 country code → `country(country_code)`                                               |
| `timezone`      | TEXT         | IANA timezone identifier (e.g., "America/New_York")                                                     |

> [!NOTE]
> The `ticker_prefix` field enables compatibility with Google Finance symbol notation (e.g., `NASDAQ:AAPL`). Multiple markets may share the same ticker_prefix (e.g., NASDAQ variants XNAS, XNGS, XNMS all use "NASDAQ").

#### Instrument

Financial instruments with optional ISIN identification.

| Column            | Type         | Description                                                    |
| ----------------- | ------------ | -------------------------------------------------------------- |
| `instrument_id`   | INTEGER (PK) | Primary key                                                    |
| `isin`            | TEXT (UQ)    | [ISIN](https://www.isin.org/) code (nullable for forex/crypto) |
| `name`            | TEXT         | Full instrument name                                           |
| `instrument_type` | TEXT         | Type (STOCK, ETF, BOND, FOREX, CRYPTO, etc.)                   |

#### Listing

Links instruments to markets with specific symbols.

## Development Workflow

### Initial Setup

```bash
# First time setup
pnpm install
pnpm dev          # Creates schema automatically via initDb()
pnpm db:seed      # Loads G10 currency master data
```

### Daily Development

```bash
# Normal development (uses existing database)
pnpm dev
```

### Schema Changes

When you modify the schema in `src/db.ts`:

```bash
# Reset database with new schema
pnpm db:reset

# This will:
# 1. Delete symb0l.db
# 2. Run app once (creates new schema)
# 3. Run seeds (loads master data)
```

### Data Updates

When you only need to update seed data:

```bash
# Re-run seeds (idempotent)
pnpm db:seed
```

Seeds use `INSERT OR REPLACE`, so running multiple times is safe.

### Fresh Start

```bash
# Reset database and start dev server
pnpm dev:fresh
```

## Seed System

### Current Seeds

- **Markets**: 30 major global trading venues (MIC-based)
  - 6 Euronext markets (Paris, Amsterdam, Milan, Brussels, Lisbon, Dublin)
  - 5 US markets (NYSE, NASDAQ variants, NYSE Arca, TSX)
  - 10 European markets (Frankfurt, London, Madrid, etc.)
  - 9 Asia-Pacific markets (Tokyo, Hong Kong, Shanghai, etc.)
- **Currencies**: 10 G10 currencies (USD, EUR, JPY, GBP, AUD, CAD, CHF, NZD, NOK, SEK)

### Seed Files

- **Data**: [`src/seeds/currencies.ts`](file:///Users/juan/work/symb0l/src/seeds/currencies.ts)
- **Orchestrator**: [`src/seeds/index.ts`](file:///Users/juan/work/symb0l/src/seeds/index.ts)

### Idempotency

All seeds use `INSERT OR REPLACE` to ensure:

- ✅ Can run multiple times safely
- ✅ No duplicate data
- ✅ Updates existing records if data changes

### Adding New Seeds

1. Create data file in `src/seeds/` (e.g., `exchanges.ts`)
2. Add seed logic to `src/seeds/index.ts`
3. Create integration test in `src/seeds/[name].integration.test.ts`
4. Run `pnpm db:reset` to test

## Testing

### Integration Tests

Integration tests validate seed data and idempotency:

```bash
# Run integration tests
pnpm test:integration

# Run all tests
pnpm test:all
```

Tests use temporary databases (`test-*.db`) that are automatically cleaned up.

See [`doc/TESTING.md`](file:///Users/juan/work/symb0l/doc/TESTING.md) for more details.

## Production Deployment

```bash
# Build and seed production database
pnpm build
pnpm seed:prod
```

## Backup & Recovery

### Manual Backup

```bash
# Backup current database
cp symb0l.db symb0l.backup.db

# Restore from backup
cp symb0l.backup.db symb0l.db
```

### Reset to Clean State

```bash
# Complete reset
pnpm db:reset
```

## Common Commands Reference

| Command                 | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `pnpm dev`              | Start development server (uses existing DB) |
| `pnpm db:reset`         | Delete DB, recreate schema, run seeds       |
| `pnpm db:seed`          | Run seeds only (idempotent)                 |
| `pnpm dev:fresh`        | Reset DB and start dev server               |
| `pnpm test:integration` | Run integration tests                       |

## Troubleshooting

### Database is corrupted

```bash
pnpm db:reset
```

### Seeds not updating

Seeds are idempotent. If you changed seed data:

```bash
pnpm db:seed  # Will update existing records
```

### Schema out of sync

```bash
pnpm db:reset  # Recreates from current schema
```

## Future Enhancements

Potential improvements for production use:

- **Migrations**: Track schema changes with migration files
- **Versioning**: Add schema version tracking
- **Rollback**: Support for reverting schema changes
- **Environments**: Separate dev/staging/prod databases
- **Automated Backups**: Scheduled backup strategy
