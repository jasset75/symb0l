import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

import { exchanges } from "./exchanges.js";

describe("Exchange Seeds Integration Tests", () => {
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

  it("should seed exactly 9 exchanges", () => {
    // Execute seed
    const stmt = testDb.prepare("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)");

    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    // Verify count
    const result = testDb.prepare("SELECT COUNT(*) as count FROM exchange").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 9);
  });

  it("should have correct exchange codes", () => {
    // Execute seed
    const stmt = testDb.prepare("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)");

    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    const expectedExchanges = [
      "EURONEXT",
      "NYSE_GROUP",
      "NASDAQ",
      "BME",
      "DEUTSCHE_BOERSE",
      "LSEG",
      "WIENER_BOERSE",
      "SIX_GROUP",
      "FOREX",
    ];

    const exchangeResults = testDb.prepare("SELECT code FROM exchange ORDER BY code").all() as {
      code: string;
    }[];

    const exchangeCodes = exchangeResults.map((e) => e.code);
    assert.deepStrictEqual(exchangeCodes, expectedExchanges.sort());
  });

  it("should be idempotent (running seeds twice should not create duplicates)", () => {
    // Execute seed first time
    const stmt = testDb.prepare("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)");

    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    const firstCount = testDb.prepare("SELECT COUNT(*) as count FROM exchange").get() as {
      count: number;
    };

    // Execute seed second time
    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    const secondCount = testDb.prepare("SELECT COUNT(*) as count FROM exchange").get() as {
      count: number;
    };

    assert.strictEqual(
      firstCount.count,
      secondCount.count,
      "Count should remain the same after running seeds twice"
    );
    assert.strictEqual(secondCount.count, 9);
  });

  it("should have Euronext as a pan-European exchange", () => {
    // Execute seed
    const stmt = testDb.prepare("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)");

    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    const euronext = testDb.prepare("SELECT * FROM exchange WHERE code = ?").get("EURONEXT") as
      | { code: string; name: string }
      | undefined;

    assert.ok(euronext, "Euronext should exist");
    assert.strictEqual(euronext.code, "EURONEXT");
    assert.strictEqual(euronext.name, "Euronext N.V.");
  });

  it("should have proper exchange names", () => {
    // Execute seed
    const stmt = testDb.prepare("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)");

    for (const exchange of exchanges) {
      stmt.run(exchange.code, exchange.name);
    }

    // Verify specific names
    const nameTests = [
      { code: "EURONEXT", name: "Euronext N.V." },
      { code: "NYSE_GROUP", name: "NYSE Group (ICE)" },
      { code: "NASDAQ", name: "NASDAQ Inc." },
      { code: "DEUTSCHE_BOERSE", name: "Deutsche Börse AG" },
    ];

    for (const test of nameTests) {
      const result = testDb.prepare("SELECT name FROM exchange WHERE code = ?").get(test.code) as {
        name: string;
      };
      assert.strictEqual(result.name, test.name, `${test.code} should have name ${test.name}`);
    }
  });
});
