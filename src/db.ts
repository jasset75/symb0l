import { DatabaseSync } from "node:sqlite";
import path from "path";

const dbPath = path.resolve("symb0l.db");
const db = new DatabaseSync(dbPath);

export function initDb() {
  // Enable WAL (Write-Ahead Logging) mode for better concurrency and performance
  db.exec("PRAGMA journal_mode = WAL;");
  // Enable foreign key constraints
  db.exec("PRAGMA foreign_keys = ON;");

  const schema = `
        -- Country (ISO 3166-1 alpha-2)
        CREATE TABLE IF NOT EXISTS country (
            country_code TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        -- Market (ISO 10383 MIC-based with ticker prefix support)
        CREATE TABLE IF NOT EXISTS market (
            market_id INTEGER PRIMARY KEY AUTOINCREMENT,
            mic_code TEXT NOT NULL UNIQUE,
            ticker_prefix TEXT,
            name TEXT NOT NULL,
            title TEXT,
            country_code TEXT NOT NULL,
            timezone TEXT,
            FOREIGN KEY (country_code) REFERENCES country(country_code)
        );

        -- Instrument
        CREATE TABLE IF NOT EXISTS instrument (
            instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
            isin TEXT UNIQUE,
            name TEXT NOT NULL,
            instrument_type TEXT NOT NULL
        );

        -- Listing
        CREATE TABLE IF NOT EXISTS listing (
            listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
            instrument_id INTEGER NOT NULL,
            market_id INTEGER NOT NULL,
            symbol_code TEXT NOT NULL,
            currency_id TEXT,
            FOREIGN KEY (instrument_id) REFERENCES instrument(instrument_id),
            FOREIGN KEY (market_id) REFERENCES market(market_id),
            FOREIGN KEY (currency_id) REFERENCES currency(currency_id),
            UNIQUE(market_id, symbol_code)
        );

        -- Currency
        CREATE TABLE IF NOT EXISTS currency (
            currency_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code3 TEXT NOT NULL,
            code2 TEXT NOT NULL,
            currency_symbol TEXT NOT NULL,
            decimal_digits INTEGER NOT NULL DEFAULT 2
        );

        -- Market Listing View (Human Friendly)
        CREATE VIEW IF NOT EXISTS view_listings AS
        SELECT
            l.listing_id,
            l.symbol_code,
            i.name AS instrument_name,
            i.instrument_type,
            m.name AS market_name,
            m.mic_code AS market_mic,
            m.timezone AS market_timezone,
            c.country_code,
            c.name AS country_name,
            cur.code3 AS currency_code,
            cur.currency_symbol
        FROM listing l
        JOIN instrument i ON l.instrument_id = i.instrument_id
        JOIN market m ON l.market_id = m.market_id
        JOIN country c ON m.country_code = c.country_code
        JOIN currency cur ON l.currency_id = cur.currency_id;
    `;
  db.exec(schema);
  console.log("Database initialized at", dbPath);
}

export { db };
