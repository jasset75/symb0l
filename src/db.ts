import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.resolve('symb0l.db');
const db = new DatabaseSync(dbPath);

export function initDb() {
    const schema = `
        -- Exchange
        CREATE TABLE IF NOT EXISTS exchange (
            exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT
        );

        -- Market
        CREATE TABLE IF NOT EXISTS market (
            market_id INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            FOREIGN KEY (exchange_id) REFERENCES exchange(exchange_id),
            UNIQUE(exchange_id, code)
        );

        -- Instrument
        CREATE TABLE IF NOT EXISTS instrument (
            instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
            isin TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            instrument_type TEXT NOT NULL
        );

        -- Listing
        CREATE TABLE IF NOT EXISTS listing (
            listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
            instrument_id INTEGER NOT NULL,
            market_id INTEGER NOT NULL,
            symbol_code TEXT NOT NULL,
            display_ticker TEXT,
            currency_id TEXT,
            FOREIGN KEY (instrument_id) REFERENCES instrument(instrument_id),
            FOREIGN KEY (market_id) REFERENCES market(market_id),
            UNIQUE(market_id, symbol_code)
        );

        -- Currency
        CREATE TABLE IF NOT EXISTS currency (
            currency_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code3 TEXT NOT NULL,
            code2 TEXT NOT NULL,
            currency_symbol TEXT NOT NULL
        );
    `;
    db.exec(schema);
    console.log('Database initialized at', dbPath);
}

export { db };
