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
            CREATE TABLE IF NOT EXISTS country (
                country_code TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                title TEXT,
                country_code TEXT NOT NULL,
                timezone TEXT,
                FOREIGN KEY (country_code) REFERENCES country(country_code)
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

            CREATE TABLE IF NOT EXISTS listing_provider_symbol (
                listing_provider_symbol_id INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                provider_symbol TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (listing_id) REFERENCES listing(listing_id),
                UNIQUE(listing_id, provider),
                UNIQUE(provider, provider_symbol)
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
    assert.ok(
      tableNames.includes("listing_provider_symbol"),
      "listing_provider_symbol table should exist"
    );
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

            CREATE TABLE country (
                country_code TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE market (
                market_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mic_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                title TEXT,
                country_code TEXT NOT NULL,
                timezone TEXT,
                FOREIGN KEY (country_code) REFERENCES country(country_code)
            );

            CREATE TABLE instrument (
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

            CREATE VIEW view_listings AS
            SELECT
                l.listing_id,
                l.symbol_code,
                i.name AS instrument_name,
                i.instrument_type,
                i.isin,
                p.name AS profile,
                rl.name AS risk_level,
                al.name AS asset_class_level,
                mc.name AS market_cap,
                s.name AS sector,
                si.name AS sub_industry,
                ce.name AS country_exposure,
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
            JOIN currency cur ON l.currency_id = cur.currency_id
            LEFT JOIN profile p ON i.profile_id = p.profile_id
            LEFT JOIN risk_level rl ON i.risk_level_id = rl.risk_level_id
            LEFT JOIN asset_class_level al ON i.asset_class_level_id = al.asset_class_level_id
            LEFT JOIN market_cap mc ON i.market_cap_id = mc.market_cap_id
            LEFT JOIN sector s ON i.sector_id = s.sector_id
            LEFT JOIN sub_industry si ON i.sub_industry_id = si.sub_industry_id
            LEFT JOIN country_exposure ce ON i.country_exposure_id = ce.country_exposure_id;
        `;

    testDb.exec(schema);
  });

  it("should create complete data hierarchy", () => {
    // Insert country
    testDb
      .prepare("INSERT INTO country (country_code, name) VALUES (?, ?)")
      .run("US", "United States");

    // Insert market
    const marketResult = testDb
      .prepare(
        "INSERT INTO market (mic_code, name, title, country_code, timezone) VALUES (?, ?, ?, ?, ?)"
      )
      .run("XNAS", "NASDAQ", "Nasdaq", "US", "America/New_York");
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

  it("should create view_listings with human friendly data", () => {
    // Insert country
    testDb
      .prepare("INSERT INTO country (country_code, name) VALUES (?, ?)")
      .run("US", "United States");

    // Insert market
    const marketResult = testDb
      .prepare(
        "INSERT INTO market (mic_code, name, title, country_code, timezone) VALUES (?, ?, ?, ?, ?)"
      )
      .run("XNAS", "NASDAQ", "Nasdaq", "US", "America/New_York");
    const marketId = Number(marketResult.lastInsertRowid);

    // Insert metadata
    testDb.prepare("INSERT INTO sector (sector_id, name) VALUES (?, ?)").run(10, "Technology");
    testDb
      .prepare("INSERT INTO risk_level (risk_level_id, name, weight) VALUES (?, ?, ?)")
      .run(5, "High", 80);

    // Insert instrument with metadata
    const instrumentResult = testDb
      .prepare(
        "INSERT INTO instrument (isin, name, instrument_type, sector_id, risk_level_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run("US0378331005", "Apple Inc.", "STOCK", 10, 5);
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

    const viewResult = testDb
      .prepare("SELECT * FROM view_listings WHERE symbol_code = ?")
      .get("AAPL") as {
      symbol_code: string;
      instrument_name: string;
      isin: string;
      profile: string;
      risk_level: string;
      asset_class_level: string;
      market_cap: string;
      sector: string;
      sub_industry: string;
      country_exposure: string;
      market_name: string;
      market_timezone: string;
      country_code: string;
      country_name: string;
      currency_code: string;
    };

    assert.ok(viewResult, "View result should exist");
    assert.strictEqual(viewResult.symbol_code, "AAPL");
    assert.strictEqual(viewResult.instrument_name, "Apple Inc.");
    assert.strictEqual(viewResult.isin, "US0378331005");
    assert.strictEqual(viewResult.sector, "Technology");
    assert.strictEqual(viewResult.risk_level, "High");
    assert.strictEqual(viewResult.market_name, "NASDAQ");
    assert.strictEqual(viewResult.market_timezone, "America/New_York", "Timezone should match");
    assert.strictEqual(viewResult.country_code, "US", "Country Code should match");
    assert.strictEqual(viewResult.country_name, "United States");
    assert.strictEqual(viewResult.currency_code, "USD");
  });
});
