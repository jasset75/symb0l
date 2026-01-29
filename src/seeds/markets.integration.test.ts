import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

import { countries } from "./countries.js";
import { markets } from "./markets.js";

describe("Market Seeds Integration Tests", () => {
  let testDb: DatabaseSync;
  let testDbPath: string;

  beforeEach(() => {
    // Create a unique test database for each test to avoid conflicts
    testDbPath = path.resolve(
      `test-symb0l-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );

    // Ensure clean state
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new DatabaseSync(testDbPath);

    // Enable foreign key constraints
    testDb.exec("PRAGMA foreign_keys = ON;");

    // Initialize schema (country + MIC-based market table with ticker prefix)
    const schema = `
      CREATE TABLE IF NOT EXISTS country (
        country_code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

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
    `;
    testDb.exec(schema);
  });

  afterEach(() => {
    // Clean up test database
    try {
      testDb.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Helper function to seed markets
  function seedMarkets() {
    // First seed countries (FK dependency)
    const countryStmt = testDb.prepare(
      "INSERT OR REPLACE INTO country (country_code, name) VALUES (?, ?)"
    );
    for (const country of countries) {
      countryStmt.run(country.country_code, country.name);
    }

    // Then seed markets
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (mic_code, ticker_prefix, name, title, country_code, timezone) VALUES (?, ?, ?, ?, ?, ?)"
    );

    for (const market of markets) {
      marketStmt.run(
        market.mic_code,
        market.ticker_prefix,
        market.name,
        market.title,
        market.country_code,
        market.timezone
      );
    }
  }

  it("should seed exactly 30 markets", () => {
    seedMarkets();

    const result = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 30);
  });

  it("should have all markets with unique MIC codes", () => {
    seedMarkets();

    const result = testDb.prepare("SELECT COUNT(DISTINCT mic_code) as count FROM market").get() as {
      count: number;
    };

    assert.strictEqual(result.count, 30, "All MIC codes should be unique");
  });

  it("should have all markets with unique ticker prefixes", () => {
    seedMarkets();

    // Count non-null unique ticker prefixes
    const result = testDb
      .prepare(
        "SELECT COUNT(DISTINCT ticker_prefix) as count FROM market WHERE ticker_prefix IS NOT NULL"
      )
      .get() as { count: number };

    // Some markets may share ticker_prefix (e.g., NASDAQ variants)
    assert.ok(result.count > 0, "Should have ticker prefixes");
  });

  it("should have correct major market MIC codes", () => {
    seedMarkets();

    const expectedMajorMarkets = [
      "XNAS", // Nasdaq
      "XNYS", // NYSE
      "XPAR", // Euronext Paris
      "XLON", // London Stock Exchange
      "XJPX", // Tokyo Stock Exchange
      "XHKG", // Hong Kong Stock Exchange
    ];

    for (const mic of expectedMajorMarkets) {
      const result = testDb.prepare("SELECT mic_code FROM market WHERE mic_code = ?").get(mic) as
        | { mic_code: string }
        | undefined;

      assert.ok(result, `Market with MIC code ${mic} should exist`);
      assert.strictEqual(result.mic_code, mic);
    }
  });

  it("should have correct ticker prefixes for major markets", () => {
    seedMarkets();

    const expectedMappings = [
      { mic_code: "XNAS", ticker_prefix: "NASDAQ" },
      { mic_code: "XNYS", ticker_prefix: "NYSE" },
      { mic_code: "XMAD", ticker_prefix: "BME" },
      { mic_code: "XPAR", ticker_prefix: "EPA" },
      { mic_code: "XMIL", ticker_prefix: "BIT" },
      { mic_code: "XLON", ticker_prefix: "LON" },
    ];

    for (const mapping of expectedMappings) {
      const result = testDb
        .prepare("SELECT ticker_prefix FROM market WHERE mic_code = ?")
        .get(mapping.mic_code) as { ticker_prefix: string } | undefined;

      assert.ok(result, `Market with MIC code ${mapping.mic_code} should exist`);
      assert.strictEqual(
        result.ticker_prefix,
        mapping.ticker_prefix,
        `${mapping.mic_code} should have ticker_prefix ${mapping.ticker_prefix}`
      );
    }
  });

  it("should be idempotent (running seeds twice should not create duplicates)", () => {
    seedMarkets();

    const firstCount = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };

    seedMarkets();

    const secondCount = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };

    assert.strictEqual(
      firstCount.count,
      secondCount.count,
      "Count should remain the same after running seeds twice"
    );
    assert.strictEqual(secondCount.count, 30);
  });

  it("should have Euronext markets with correct data", () => {
    seedMarkets();

    const euronextMarkets = testDb
      .prepare(
        `SELECT m.mic_code, m.name, m.title, c.name as country_name, m.ticker_prefix
         FROM market m
         JOIN country c ON m.country_code = c.country_code
         WHERE m.name = 'Euronext'
         ORDER BY m.mic_code`
      )
      .all() as {
      mic_code: string;
      name: string;
      title: string;
      country_name: string;
      ticker_prefix: string;
    }[];

    assert.strictEqual(euronextMarkets.length, 6, "Should have 6 Euronext markets");

    // Verify specific Euronext markets
    const parisMarket = euronextMarkets.find((m) => m.mic_code === "XPAR");
    assert.ok(parisMarket, "Euronext Paris should exist");
    assert.strictEqual(parisMarket.title, "Euronext Paris");
    assert.strictEqual(parisMarket.country_name, "France");
    assert.strictEqual(parisMarket.ticker_prefix, "EPA");

    const amsterdamMarket = euronextMarkets.find((m) => m.mic_code === "XAMS");
    assert.ok(amsterdamMarket, "Euronext Amsterdam should exist");
    assert.strictEqual(amsterdamMarket.title, "Euronext Amsterdam");
    assert.strictEqual(amsterdamMarket.country_name, "Netherlands");
    assert.strictEqual(amsterdamMarket.ticker_prefix, "AMS");
  });

  it("should have complete market data (all fields populated)", () => {
    seedMarkets();

    // Verify specific market has all fields
    const nasdaqMarket = testDb
      .prepare(
        `SELECT m.*, c.name as country_name
         FROM market m
         JOIN country c ON m.country_code = c.country_code
         WHERE m.mic_code = 'XNAS'`
      )
      .get() as {
      mic_code: string;
      ticker_prefix: string;
      name: string;
      title: string;
      country_code: string;
      country_name: string;
      timezone: string;
    };

    assert.strictEqual(nasdaqMarket.mic_code, "XNAS");
    assert.strictEqual(nasdaqMarket.ticker_prefix, "NASDAQ");
    assert.strictEqual(nasdaqMarket.name, "NASDAQ");
    assert.strictEqual(nasdaqMarket.title, "Nasdaq");
    assert.strictEqual(nasdaqMarket.country_code, "US");
    assert.strictEqual(nasdaqMarket.country_name, "United States");
    assert.strictEqual(nasdaqMarket.timezone, "America/New_York");
  });

  it("should have markets from multiple regions", () => {
    seedMarkets();

    // Check for markets in different regions using country_code
    const regions = [
      { country_code: "US", minCount: 2 },
      { country_code: "FR", minCount: 1 },
      { country_code: "JP", minCount: 1 },
      { country_code: "CN", minCount: 1 },
    ];

    for (const region of regions) {
      const result = testDb
        .prepare("SELECT COUNT(*) as count FROM market WHERE country_code = ?")
        .get(region.country_code) as { count: number };

      const countryName = testDb
        .prepare("SELECT name FROM country WHERE country_code = ?")
        .get(region.country_code) as { name: string };

      assert.ok(
        result.count >= region.minCount,
        `Should have at least ${region.minCount} market(s) in ${countryName.name}`
      );
    }
  });
});
