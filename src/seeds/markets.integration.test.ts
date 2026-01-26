import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

import { exchanges } from "./exchanges.js";
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

    // Initialize schema
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
        name TEXT,
        FOREIGN KEY (exchange_id) REFERENCES exchange(exchange_id),
        UNIQUE(exchange_id, code)
      );
    `;
    testDb.exec(schema);

    // Seed exchanges first (markets depend on them)
    const exchangeStmt = testDb.prepare(
      "INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)"
    );
    for (const exchange of exchanges) {
      exchangeStmt.run(exchange.code, exchange.name);
    }
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

  it("should seed exactly 11 markets", () => {
    // Execute seed
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    // Verify count
    const result = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 11);
  });

  it("should have all markets linked to valid exchanges", () => {
    // Execute seed
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    const result = testDb
      .prepare(
        `SELECT COUNT(*) as count 
         FROM market m 
         JOIN exchange e ON m.exchange_id = e.exchange_id`
      )
      .get() as { count: number };
    assert.strictEqual(result.count, 11);
  });

  it("should have correct market codes", () => {
    // Execute seed
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    const expectedMarkets = [
      "AMS",
      "BIT",
      "BME",
      "EPA",
      "FOREX",
      "FRA",
      "LON",
      "NASDAQ",
      "NYSE",
      "SWX",
      "VIE",
    ];

    const marketResults = testDb.prepare("SELECT code FROM market ORDER BY code").all() as {
      code: string;
    }[];

    const marketCodes = marketResults.map((m) => m.code);
    assert.deepStrictEqual(marketCodes, expectedMarkets);
  });

  it("should be idempotent (running seeds twice should not create duplicates)", () => {
    // Execute seed first time
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    const firstCount = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };

    // Execute seed second time
    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    const secondCount = testDb.prepare("SELECT COUNT(*) as count FROM market").get() as {
      count: number;
    };

    assert.strictEqual(
      firstCount.count,
      secondCount.count,
      "Count should remain the same after running seeds twice"
    );
    assert.strictEqual(secondCount.count, 11);
  });

  it("should have Euronext operating multiple markets", () => {
    // Execute seed
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    const euronextMarkets = testDb
      .prepare(
        `SELECT m.code, m.name
         FROM market m
         JOIN exchange e ON m.exchange_id = e.exchange_id
         WHERE e.code = 'EURONEXT'
         ORDER BY m.code`
      )
      .all() as { code: string; name: string }[];

    assert.strictEqual(euronextMarkets.length, 3, "Euronext should operate 3 markets");

    const expectedEuronextMarkets = [
      { code: "AMS", name: "Euronext Amsterdam" },
      { code: "BIT", name: "Borsa Italiana (Milan)" },
      { code: "EPA", name: "Euronext Paris" },
    ];

    // Check each market individually to avoid null prototype comparison issues
    assert.strictEqual(euronextMarkets[0].code, "AMS");
    assert.strictEqual(euronextMarkets[0].name, "Euronext Amsterdam");
    assert.strictEqual(euronextMarkets[1].code, "BIT");
    assert.strictEqual(euronextMarkets[1].name, "Borsa Italiana (Milan)");
    assert.strictEqual(euronextMarkets[2].code, "EPA");
    assert.strictEqual(euronextMarkets[2].name, "Euronext Paris");
  });

  it("should have market names", () => {
    // Execute seed
    const marketStmt = testDb.prepare(
      "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)"
    );

    for (const market of markets) {
      const exchangeResult = testDb
        .prepare("SELECT exchange_id FROM exchange WHERE code = ?")
        .get(market.exchange_code) as { exchange_id: number } | undefined;

      if (!exchangeResult) {
        throw new Error(`Exchange with code '${market.exchange_code}' not found`);
      }

      marketStmt.run(exchangeResult.exchange_id, market.code, market.name);
    }

    // Verify specific market names
    const nameTests = [
      { code: "EPA", name: "Euronext Paris" },
      { code: "NYSE", name: "NYSE Main Market" },
      { code: "FRA", name: "Xetra Frankfurt" },
    ];

    for (const test of nameTests) {
      const result = testDb.prepare("SELECT name FROM market WHERE code = ?").get(test.code) as {
        name: string;
      };
      assert.strictEqual(
        result.name,
        test.name,
        `Market ${test.code} should have name ${test.name}`
      );
    }
  });
});
