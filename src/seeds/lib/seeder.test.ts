import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { seed, type SeederConfig } from "./seeder.js";

interface TestEntity {
  code: string;
  name: string;
}

interface TestEntityWithFK {
  code: string;
  name: string;
  parentCode: string;
}

describe("seed", () => {
  it("should seed data without transform function", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    const testData: TestEntity[] = [
      { code: "TEST1", name: "Test One" },
      { code: "TEST2", name: "Test Two" },
      { code: "TEST3", name: "Test Three" },
    ];

    const config: SeederConfig<TestEntity> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name) VALUES (?, ?)",
      data: testData,
      mapToValues: (item) => [item.code, item.name],
    };

    const count = seed(db, config);

    assert.strictEqual(count, 3);

    // Verify data was inserted
    const result = db.prepare("SELECT COUNT(*) as count FROM test_entity").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 3);

    db.close();
  });

  it("should seed data with transform function", () => {
    const db = new DatabaseSync(":memory:");

    // Setup parent and child tables
    db.exec(`
      CREATE TABLE parent (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      );
      
      CREATE TABLE child (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent_id INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES parent(id)
      )
    `);

    db.exec("PRAGMA foreign_keys = ON");

    // Seed parent data first
    db.prepare("INSERT INTO parent (code, name) VALUES (?, ?)").run("PARENT1", "Parent One");

    const childData: TestEntityWithFK[] = [
      { code: "CHILD1", name: "Child One", parentCode: "PARENT1" },
    ];

    const config: SeederConfig<TestEntityWithFK> = {
      entityName: "child entities",
      sql: "INSERT OR REPLACE INTO child (code, name, parent_id) VALUES (?, ?, ?)",
      data: childData,
      mapToValues: (item) => [
        item.code,
        item.name,
        (item as unknown as Record<string, number>).parent_id,
      ],
      transform: (item, db) => {
        const parent = db.prepare("SELECT id FROM parent WHERE code = ?").get(item.parentCode) as {
          id: number;
        };
        return { ...item, parent_id: parent.id };
      },
    };

    const count = seed(db, config);

    assert.strictEqual(count, 1);

    // Verify data was inserted with correct foreign key
    const result = db.prepare("SELECT * FROM child WHERE code = ?").get("CHILD1") as Record<
      string,
      string | number
    >;
    assert.strictEqual(result.code, "CHILD1");
    assert.strictEqual(result.parent_id, 1);

    db.close();
  });

  it("should be idempotent with INSERT OR REPLACE", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    const testData: TestEntity[] = [{ code: "TEST1", name: "Test One" }];

    const config: SeederConfig<TestEntity> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name) VALUES (?, ?)",
      data: testData,
      mapToValues: (item) => [item.code, item.name],
    };

    // Seed twice
    const count1 = seed(db, config);
    const count2 = seed(db, config);

    assert.strictEqual(count1, 1);
    assert.strictEqual(count2, 1);

    // Verify only one record exists
    const result = db.prepare("SELECT COUNT(*) as count FROM test_entity").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 1);

    db.close();
  });

  it("should return correct count for empty data array", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    const config: SeederConfig<TestEntity> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name) VALUES (?, ?)",
      data: [],
      mapToValues: (item) => [item.code, item.name],
    };

    const count = seed(db, config);

    assert.strictEqual(count, 0);

    db.close();
  });

  it("should handle null values correctly", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table with nullable column
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT,
        description TEXT
      )
    `);

    interface TestEntityWithNulls {
      code: string;
      name: string | null;
      description: string | null;
    }

    const testData: TestEntityWithNulls[] = [
      { code: "TEST1", name: "Test One", description: null },
      { code: "TEST2", name: null, description: "Description Two" },
    ];

    const config: SeederConfig<TestEntityWithNulls> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name, description) VALUES (?, ?, ?)",
      data: testData,
      mapToValues: (item) => [item.code, item.name, item.description],
    };

    const count = seed(db, config);

    assert.strictEqual(count, 2);

    // Verify null values were inserted correctly
    const result1 = db.prepare("SELECT * FROM test_entity WHERE code = ?").get("TEST1") as Record<
      string,
      string | null
    >;
    assert.strictEqual(result1.description, null);

    const result2 = db.prepare("SELECT * FROM test_entity WHERE code = ?").get("TEST2") as Record<
      string,
      string | null
    >;
    assert.strictEqual(result2.name, null);

    db.close();
  });

  it("should seed multiple records efficiently", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    // Generate 100 test records
    const testData: TestEntity[] = Array.from({ length: 100 }, (_, i) => ({
      code: `TEST${i + 1}`,
      name: `Test ${i + 1}`,
    }));

    const config: SeederConfig<TestEntity> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name) VALUES (?, ?)",
      data: testData,
      mapToValues: (item) => [item.code, item.name],
    };

    const count = seed(db, config);

    assert.strictEqual(count, 100);

    // Verify all records were inserted
    const result = db.prepare("SELECT COUNT(*) as count FROM test_entity").get() as {
      count: number;
    };
    assert.strictEqual(result.count, 100);

    db.close();
  });

  it("should pass database instance to transform function", () => {
    const db = new DatabaseSync(":memory:");

    // Setup test table
    db.exec(`
      CREATE TABLE test_entity (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);

    const testData: TestEntity[] = [{ code: "TEST1", name: "Test One" }];

    let dbInstancePassed = false;

    const config: SeederConfig<TestEntity> = {
      entityName: "test entities",
      sql: "INSERT OR REPLACE INTO test_entity (code, name) VALUES (?, ?)",
      data: testData,
      mapToValues: (item) => [item.code, item.name],
      transform: (item, dbInstance) => {
        // Verify db instance is passed correctly
        dbInstancePassed = dbInstance === db;
        return item;
      },
    };

    seed(db, config);

    assert.strictEqual(dbInstancePassed, true);

    db.close();
  });
});
