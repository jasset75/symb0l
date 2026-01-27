import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { resolveForeignKey } from "./resolvers.js";

describe("resolveForeignKey", () => {
  it("should resolve foreign key by string value", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE exchange (
        exchange_id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    db.prepare("INSERT INTO exchange (code, name) VALUES (?, ?)").run("EURONEXT", "Euronext");

    // Test resolution
    const result = resolveForeignKey(db, "exchange", "exchange_id", "code", "EURONEXT");

    assert.strictEqual(typeof result, "number");
    assert.strictEqual(result, 1);

    db.close();
  });

  it("should resolve foreign key by numeric value", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE market (
        market_id INTEGER PRIMARY KEY,
        code TEXT NOT NULL,
        exchange_id INTEGER NOT NULL
      )
    `);

    db.prepare("INSERT INTO market (code, exchange_id) VALUES (?, ?)").run("EPA", 5);

    // Test resolution
    const result = resolveForeignKey(db, "market", "market_id", "exchange_id", 5);

    assert.strictEqual(typeof result, "number");
    assert.strictEqual(result, 1);

    db.close();
  });

  it("should throw error when foreign key not found", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE exchange (
        exchange_id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    db.prepare("INSERT INTO exchange (code, name) VALUES (?, ?)").run("EURONEXT", "Euronext");

    // Test error case
    assert.throws(() => resolveForeignKey(db, "exchange", "exchange_id", "code", "NONEXISTENT"), {
      name: "Error",
      message: "exchange: code='NONEXISTENT' not found",
    });

    db.close();
  });

  it("should return correct ID when multiple records exist", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE exchange (
        exchange_id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    const stmt = db.prepare("INSERT INTO exchange (code, name) VALUES (?, ?)");
    stmt.run("EURONEXT", "Euronext");
    stmt.run("NYSE", "New York Stock Exchange");
    stmt.run("LSE", "London Stock Exchange");

    // Test resolution of second record
    const result = resolveForeignKey(db, "exchange", "exchange_id", "code", "NYSE");

    assert.strictEqual(result, 2);

    db.close();
  });

  it("should work with different column names", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table with custom column names
    db.exec(`
      CREATE TABLE custom_table (
        id INTEGER PRIMARY KEY,
        unique_code TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `);

    db.prepare("INSERT INTO custom_table (unique_code, description) VALUES (?, ?)").run(
      "TEST123",
      "Test Description"
    );

    // Test resolution with custom column names
    const result = resolveForeignKey(db, "custom_table", "id", "unique_code", "TEST123");

    assert.strictEqual(result, 1);

    db.close();
  });

  it("should handle case-sensitive string matching", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE exchange (
        exchange_id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    db.prepare("INSERT INTO exchange (code, name) VALUES (?, ?)").run("EURONEXT", "Euronext");

    // SQLite is case-sensitive by default for TEXT comparisons
    assert.throws(() => resolveForeignKey(db, "exchange", "exchange_id", "code", "euronext"), {
      name: "Error",
      message: "exchange: code='euronext' not found",
    });

    db.close();
  });
});
