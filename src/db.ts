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
            instrument_type TEXT NOT NULL,
            profile_id INTEGER,
            risk_level_id INTEGER,
            asset_class_level_id INTEGER,
            market_cap_id INTEGER,
            sector_id INTEGER,
            sub_industry_id INTEGER,
            country_exposure_id INTEGER,
            FOREIGN KEY (profile_id) REFERENCES profile(profile_id),
            FOREIGN KEY (risk_level_id) REFERENCES risk_level(risk_level_id),
            FOREIGN KEY (asset_class_level_id) REFERENCES asset_class_level(asset_class_level_id),
            FOREIGN KEY (market_cap_id) REFERENCES market_cap(market_cap_id),
            FOREIGN KEY (sector_id) REFERENCES sector(sector_id),
            FOREIGN KEY (sub_industry_id) REFERENCES sub_industry(sub_industry_id),
            FOREIGN KEY (country_exposure_id) REFERENCES country_exposure(country_exposure_id)
        );

        -- Metadata Tables
        CREATE TABLE IF NOT EXISTS profile (
            profile_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS risk_level (
            risk_level_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            weight INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS asset_class_level (
            asset_class_level_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS market_cap (
            market_cap_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS sector (
            sector_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS sub_industry (
            sub_industry_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS country_exposure (
            country_exposure_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
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
