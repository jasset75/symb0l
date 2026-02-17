import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

import { currencies } from "./currencies.js";

describe("Currency Seeds Integration Tests", () => {
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

    // Initialize schema
    const schema = `
      CREATE TABLE IF NOT EXISTS currency (
        currency_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code3 TEXT NOT NULL,
        code2 TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        decimal_digits INTEGER NOT NULL DEFAULT 2
      );
    `;
    testDb.exec(schema);
  });

  afterEach(() => {
    // Clean up test database
    try {
      testDb.close();
      // Small delay to ensure file handle is released
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should seed exactly 10 G10 currencies", () => {
    // Execute seed
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    // Verify count
    const result = testDb.prepare("SELECT COUNT(*) as count FROM currency").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 10, "Should have exactly 10 currencies");
  });

  it("should insert all G10 currencies with correct data", () => {
    // Execute seed
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    // Verify all expected currencies exist
    const expectedCodes = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD", "NOK", "SEK"];

    for (const code of expectedCodes) {
      const result = testDb.prepare("SELECT * FROM currency WHERE code3 = ?").get(code);
      assert.ok(result, `Currency ${code} should exist`);
    }
  });

  it("should be idempotent (running seeds twice should not create duplicates)", () => {
    // Execute seed first time
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    const firstCount = testDb.prepare("SELECT COUNT(*) as count FROM currency").get() as {
      count: number;
    };

    // Execute seed second time
    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    const secondCount = testDb.prepare("SELECT COUNT(*) as count FROM currency").get() as {
      count: number;
    };

    assert.strictEqual(
      firstCount.count,
      secondCount.count,
      "Count should remain the same after running seeds twice"
    );
    assert.strictEqual(secondCount.count, 10, "Should still have exactly 10 currencies");
  });

  it("should have correct decimal_digits for each currency", () => {
    // Execute seed
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    // Verify JPY has 0 decimal digits
    const jpy = testDb
      .prepare("SELECT decimal_digits FROM currency WHERE code3 = ?")
      .get("JPY") as {
      decimal_digits: number;
    };
    assert.strictEqual(jpy.decimal_digits, 0, "JPY should have 0 decimal digits");

    // Verify other currencies have 2 decimal digits
    const otherCurrencies = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "NZD", "NOK", "SEK"];
    for (const code of otherCurrencies) {
      const result = testDb
        .prepare("SELECT decimal_digits FROM currency WHERE code3 = ?")
        .get(code) as {
        decimal_digits: number;
      };
      assert.strictEqual(result.decimal_digits, 2, `${code} should have 2 decimal digits`);
    }
  });

  it("should have correct currency symbols", () => {
    // Execute seed
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const currency of currencies) {
      stmt.run(
        currency.currency_id,
        currency.name,
        currency.code3,
        currency.code2,
        currency.currency_symbol,
        currency.decimal_digits
      );
    }

    // Verify specific symbols
    const symbolTests = [
      { code: "USD", symbol: "$" },
      { code: "EUR", symbol: "€" },
      { code: "JPY", symbol: "¥" },
      { code: "GBP", symbol: "£" },
    ];

    for (const test of symbolTests) {
      const result = testDb
        .prepare("SELECT currency_symbol FROM currency WHERE code3 = ?")
        .get(test.code) as {
        currency_symbol: string;
      };
      assert.strictEqual(
        result.currency_symbol,
        test.symbol,
        `${test.code} should have symbol ${test.symbol}`
      );
    }
  });
});
