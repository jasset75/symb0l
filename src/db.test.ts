import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

describe('Database Initialization', () => {
    let testDb: DatabaseSync;
    const testDbPath = path.resolve('test-symb0l.db');

    beforeEach(() => {
        // Create a fresh in-memory database for each test
        testDb = new DatabaseSync(':memory:');
    });

    afterEach(() => {
        // Clean up test database file if it exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    it('should create all required tables', () => {
        const schema = `
            CREATE TABLE IF NOT EXISTS exchange (
                exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT
            );

            CREATE TABLE IF NOT EXISTS market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exchange_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                FOREIGN KEY (exchange_id) REFERENCES exchange(exchange_id),
                UNIQUE(exchange_id, code)
            );

            CREATE TABLE IF NOT EXISTS instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                instrument_type TEXT NOT NULL
            );

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

            CREATE TABLE IF NOT EXISTS currency (
                currency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code3 TEXT NOT NULL,
                code2 TEXT NOT NULL,
                currency_symbol TEXT NOT NULL
            );
        `;

        testDb.exec(schema);

        // Verify all tables were created
        const tables = testDb.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `).all() as Array<{ name: string }>;

        const tableNames = tables.map(t => t.name);

        assert.ok(tableNames.includes('exchange'), 'exchange table should exist');
        assert.ok(tableNames.includes('market'), 'market table should exist');
        assert.ok(tableNames.includes('instrument'), 'instrument table should exist');
        assert.ok(tableNames.includes('listing'), 'listing table should exist');
        assert.ok(tableNames.includes('currency'), 'currency table should exist');
    });

    it('should enforce UNIQUE constraint on exchange code', () => {
        const schema = `
            CREATE TABLE exchange (
                exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT
            );
        `;

        testDb.exec(schema);

        // Insert first exchange
        testDb.prepare('INSERT INTO exchange (code, name) VALUES (?, ?)').run('NYSE', 'New York Stock Exchange');

        // Attempt to insert duplicate code should throw
        assert.throws(
            () => {
                testDb.prepare('INSERT INTO exchange (code, name) VALUES (?, ?)').run('NYSE', 'Duplicate');
            },
            /UNIQUE constraint failed/,
            'Should throw UNIQUE constraint error'
        );
    });

    it('should enforce FOREIGN KEY constraint on market', () => {
        const schema = `
            PRAGMA foreign_keys = ON;
            
            CREATE TABLE exchange (
                exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT
            );

            CREATE TABLE market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exchange_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                FOREIGN KEY (exchange_id) REFERENCES exchange(exchange_id)
            );
        `;

        testDb.exec(schema);

        // Attempt to insert market with non-existent exchange_id should throw
        assert.throws(
            () => {
                testDb.prepare('INSERT INTO market (exchange_id, code) VALUES (?, ?)').run(999, 'INVALID');
            },
            /FOREIGN KEY constraint failed/,
            'Should throw FOREIGN KEY constraint error'
        );
    });

    it('should enforce NOT NULL constraint on instrument fields', () => {
        const schema = `
            CREATE TABLE instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                instrument_type TEXT NOT NULL
            );
        `;

        testDb.exec(schema);

        // Attempt to insert with NULL name should throw
        assert.throws(
            () => {
                testDb.prepare('INSERT INTO instrument (isin, name, instrument_type) VALUES (?, ?, ?)').run('US1234567890', null, 'STOCK');
            },
            /NOT NULL constraint failed/,
            'Should throw NOT NULL constraint error'
        );
    });

    it('should allow multiple initializations (idempotent)', () => {
        const schema = `
            CREATE TABLE IF NOT EXISTS exchange (
                exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT
            );
        `;

        // First initialization
        testDb.exec(schema);
        testDb.prepare('INSERT INTO exchange (code, name) VALUES (?, ?)').run('NYSE', 'New York Stock Exchange');

        // Second initialization should not error
        assert.doesNotThrow(() => {
            testDb.exec(schema);
        }, 'Multiple initializations should not throw');

        // Data should be preserved
        const exchanges = testDb.prepare('SELECT * FROM exchange').all() as Array<{ code: string; name: string }>;
        assert.strictEqual(exchanges.length, 1, 'Should have one exchange');
        assert.strictEqual(exchanges[0].code, 'NYSE', 'Exchange code should be preserved');
    });

    it('should handle currency table with TEXT primary key', () => {
        const schema = `
            CREATE TABLE currency (
                currency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code3 TEXT NOT NULL,
                code2 TEXT NOT NULL,
                currency_symbol TEXT NOT NULL
            );
        `;

        testDb.exec(schema);

        // Insert a currency
        testDb.prepare('INSERT INTO currency (currency_id, name, code3, code2, currency_symbol) VALUES (?, ?, ?, ?, ?)').run('USD', 'US Dollar', 'USD', 'US', '$');

        // Verify insertion
        const currency = testDb.prepare('SELECT * FROM currency WHERE currency_id = ?').get('USD') as { name: string; code3: string };
        assert.strictEqual(currency.name, 'US Dollar', 'Currency name should match');
        assert.strictEqual(currency.code3, 'USD', 'Currency code3 should match');
    });
});

describe('Database Schema Relationships', () => {
    let testDb: DatabaseSync;

    beforeEach(() => {
        testDb = new DatabaseSync(':memory:');

        const schema = `
            PRAGMA foreign_keys = ON;

            CREATE TABLE exchange (
                exchange_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT
            );

            CREATE TABLE market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exchange_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                FOREIGN KEY (exchange_id) REFERENCES exchange(exchange_id),
                UNIQUE(exchange_id, code)
            );

            CREATE TABLE instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                instrument_type TEXT NOT NULL
            );

            CREATE TABLE listing (
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

            CREATE TABLE currency (
                currency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code3 TEXT NOT NULL,
                code2 TEXT NOT NULL,
                currency_symbol TEXT NOT NULL
            );
        `;

        testDb.exec(schema);
    });

    it('should create complete data hierarchy', () => {
        // Insert exchange
        const exchangeResult = testDb.prepare('INSERT INTO exchange (code, name) VALUES (?, ?)').run('NYSE', 'New York Stock Exchange');
        const exchangeId = Number(exchangeResult.lastInsertRowid);

        // Insert market
        const marketResult = testDb.prepare('INSERT INTO market (exchange_id, code) VALUES (?, ?)').run(exchangeId, 'EQUITY');
        const marketId = Number(marketResult.lastInsertRowid);

        // Insert instrument
        const instrumentResult = testDb.prepare('INSERT INTO instrument (isin, name, instrument_type) VALUES (?, ?, ?)').run('US0378331005', 'Apple Inc.', 'STOCK');
        const instrumentId = Number(instrumentResult.lastInsertRowid);

        // Insert currency
        testDb.prepare('INSERT INTO currency (currency_id, name, code3, code2, currency_symbol) VALUES (?, ?, ?, ?, ?)').run('USD', 'US Dollar', 'USD', 'US', '$');

        // Insert listing
        testDb.prepare('INSERT INTO listing (instrument_id, market_id, symbol_code, display_ticker, currency_id) VALUES (?, ?, ?, ?, ?)').run(instrumentId, marketId, 'AAPL', 'AAPL', 'USD');

        // Verify complete data
        const listing = testDb.prepare(`
            SELECT 
                l.symbol_code,
                l.display_ticker,
                i.name as instrument_name,
                i.isin,
                m.code as market_code,
                e.code as exchange_code,
                c.currency_symbol
            FROM listing l
            JOIN instrument i ON l.instrument_id = i.instrument_id
            JOIN market m ON l.market_id = m.market_id
            JOIN exchange e ON m.exchange_id = e.exchange_id
            JOIN currency c ON l.currency_id = c.currency_id
            WHERE l.symbol_code = ?
        `).get('AAPL') as {
            symbol_code: string;
            instrument_name: string;
            isin: string;
            exchange_code: string;
            currency_symbol: string;
        };

        assert.strictEqual(listing.symbol_code, 'AAPL', 'Symbol code should match');
        assert.strictEqual(listing.instrument_name, 'Apple Inc.', 'Instrument name should match');
        assert.strictEqual(listing.isin, 'US0378331005', 'ISIN should match');
        assert.strictEqual(listing.exchange_code, 'NYSE', 'Exchange code should match');
        assert.strictEqual(listing.currency_symbol, '$', 'Currency symbol should match');
    });
});
