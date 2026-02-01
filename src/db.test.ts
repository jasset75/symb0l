import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

describe("Database Initialization", () => {
  let testDb: DatabaseSync;
  const testDbPath = path.resolve("test-symb0l.db");

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    testDb = new DatabaseSync(":memory:");
  });

  afterEach(() => {
    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("should create all required tables", () => {
    const schema = `
            CREATE TABLE IF NOT EXISTS market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                title TEXT,
                country TEXT,
                timezone TEXT
            );

            CREATE TABLE IF NOT EXISTS instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT UNIQUE,
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
                FOREIGN KEY (currency_id) REFERENCES currency(currency_id),
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
    const tables = testDb
      .prepare(
        `
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);

    assert.ok(tableNames.includes("market"), "market table should exist");
    assert.ok(tableNames.includes("instrument"), "instrument table should exist");
    assert.ok(tableNames.includes("listing"), "listing table should exist");
    assert.ok(tableNames.includes("currency"), "currency table should exist");
  });

  it("should enforce UNIQUE constraint on market MIC code", () => {
    const schema = `
            CREATE TABLE market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL
            );
        `;

    testDb.exec(schema);

    // Insert first market
    testDb.prepare("INSERT INTO market (mic_code, name) VALUES (?, ?)").run("XNAS", "NASDAQ");

    // Attempt to insert duplicate MIC code should throw
    assert.throws(
      () => {
        testDb
          .prepare("INSERT INTO market (mic_code, name) VALUES (?, ?)")
          .run("XNAS", "Duplicate");
      },
      /UNIQUE constraint failed/,
      "Should throw UNIQUE constraint error"
    );
  });

  it("should enforce NOT NULL constraint on instrument fields", () => {
    const schema = `
            CREATE TABLE instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT UNIQUE,
                name TEXT NOT NULL,
                instrument_type TEXT NOT NULL
            );
        `;

    testDb.exec(schema);

    // Attempt to insert with NULL name should throw
    assert.throws(
      () => {
        testDb
          .prepare("INSERT INTO instrument (isin, name, instrument_type) VALUES (?, ?, ?)")
          .run("US1234567890", null, "STOCK");
      },
      /NOT NULL constraint failed/,
      "Should throw NOT NULL constraint error"
    );
  });

  it("should allow NULL ISIN for instruments without ISIN", () => {
    const schema = `
            CREATE TABLE instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT UNIQUE,
                name TEXT NOT NULL,
                instrument_type TEXT NOT NULL
            );
        `;

    testDb.exec(schema);

    // Insert instrument without ISIN (e.g., forex pair)
    assert.doesNotThrow(() => {
      testDb
        .prepare("INSERT INTO instrument (isin, name, instrument_type) VALUES (?, ?, ?)")
        .run(null, "EUR/USD", "FOREX");
    }, "Should allow NULL ISIN");

    const instrument = testDb.prepare("SELECT * FROM instrument WHERE name = ?").get("EUR/USD") as {
      isin: null;
      name: string;
    };

    assert.strictEqual(instrument.isin, null, "ISIN should be NULL");
    assert.strictEqual(instrument.name, "EUR/USD", "Name should match");
  });

  it("should allow multiple initializations (idempotent)", () => {
    const schema = `
            CREATE TABLE IF NOT EXISTS market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL
            );
        `;

    // First initialization
    testDb.exec(schema);
    testDb
      .prepare("INSERT INTO market (mic_code, name) VALUES (?, ?)")
      .run("XNYS", "New York Stock Exchange");

    // Second initialization should not error
    assert.doesNotThrow(() => {
      testDb.exec(schema);
    }, "Multiple initializations should not throw");

    // Data should be preserved
    const markets = testDb.prepare("SELECT * FROM market").all() as Array<{
      mic_code: string;
      name: string;
    }>;
    assert.strictEqual(markets.length, 1, "Should have one market");
    assert.strictEqual(markets[0].mic_code, "XNYS", "Market MIC code should be preserved");
  });

  it("should handle currency table with TEXT primary key", () => {
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
    testDb
      .prepare(
        "INSERT INTO currency (currency_id, name, code3, code2, currency_symbol) VALUES (?, ?, ?, ?, ?)"
      )
      .run("USD", "US Dollar", "USD", "US", "$");

    // Verify insertion
    const currency = testDb.prepare("SELECT * FROM currency WHERE currency_id = ?").get("USD") as {
      name: string;
      code3: string;
    };
    assert.strictEqual(currency.name, "US Dollar", "Currency name should match");
    assert.strictEqual(currency.code3, "USD", "Currency code3 should match");
  });
});

describe("Database Schema Relationships", () => {
  let testDb: DatabaseSync;

  beforeEach(() => {
    testDb = new DatabaseSync(":memory:");

    const schema = `
            PRAGMA foreign_keys = ON;

            CREATE TABLE market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                title TEXT,
                country TEXT,
                timezone TEXT
            );

            CREATE TABLE instrument (
                instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT UNIQUE,
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
                FOREIGN KEY (currency_id) REFERENCES currency(currency_id),
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

  it("should create complete data hierarchy", () => {
    // Insert market
    const marketResult = testDb
      .prepare(
        "INSERT INTO market (mic_code, name, title, country, timezone) VALUES (?, ?, ?, ?, ?)"
      )
      .run("XNAS", "NASDAQ", "Nasdaq", "United States", "America/New_York");
    const marketId = Number(marketResult.lastInsertRowid);

    // Insert instrument
    const instrumentResult = testDb
      .prepare("INSERT INTO instrument (isin, name, instrument_type) VALUES (?, ?, ?)")
      .run("US0378331005", "Apple Inc.", "STOCK");
    const instrumentId = Number(instrumentResult.lastInsertRowid);

    // Insert currency
    testDb
      .prepare(
        "INSERT INTO currency (currency_id, name, code3, code2, currency_symbol) VALUES (?, ?, ?, ?, ?)"
      )
      .run("USD", "US Dollar", "USD", "US", "$");

    // Insert listing
    testDb
      .prepare(
        "INSERT INTO listing (instrument_id, market_id, symbol_code, currency_id) VALUES (?, ?, ?, ?)"
      )
      .run(instrumentId, marketId, "AAPL", "USD");

    // Verify complete data
    const listing = testDb
      .prepare(
        `
            SELECT 
                l.symbol_code,
                i.name as instrument_name,
                i.isin,
                m.mic_code,
                m.title as market_title,
                c.currency_symbol
            FROM listing l
            JOIN instrument i ON l.instrument_id = i.instrument_id
            JOIN market m ON l.market_id = m.market_id
            JOIN currency c ON l.currency_id = c.currency_id
            WHERE l.symbol_code = ?
        `
      )
      .get("AAPL") as {
      symbol_code: string;
      instrument_name: string;
      isin: string;
      mic_code: string;
      market_title: string;
      currency_symbol: string;
    };

    assert.strictEqual(listing.symbol_code, "AAPL", "Symbol code should match");
    assert.strictEqual(listing.instrument_name, "Apple Inc.", "Instrument name should match");
    assert.strictEqual(listing.isin, "US0378331005", "ISIN should match");
    assert.strictEqual(listing.mic_code, "XNAS", "MIC code should match");
    assert.strictEqual(listing.market_title, "Nasdaq", "Market title should match");
    assert.strictEqual(listing.currency_symbol, "$", "Currency symbol should match");
  });

  it("should enforce FOREIGN KEY constraint on listing", () => {
    // Attempt to insert listing with non-existent market_id should throw
    assert.throws(
      () => {
        testDb
          .prepare("INSERT INTO listing (instrument_id, market_id, symbol_code) VALUES (?, ?, ?)")
          .run(1, 999, "INVALID");
      },
      /FOREIGN KEY constraint failed/,
      "Should throw FOREIGN KEY constraint error"
    );
  });
});
