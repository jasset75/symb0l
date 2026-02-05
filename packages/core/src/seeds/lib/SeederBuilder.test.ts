import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { SeederBuilder } from "./SeederBuilder.js";

interface TestEntity {
  code: string;
  name: string;
}

interface TestEntityWithFK {
  code: string;
  name: string;
  parentCode: string;
}

describe("SeederBuilder", () => {
  describe("fluent API", () => {
    it("should chain methods fluently", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        )
      `);

      const testData: TestEntity[] = [{ code: "TEST1", name: "Test One" }];

      const builder = new SeederBuilder<TestEntity>(db)
        .entity("test entities")
        .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
        .data(testData)
        .mapToValues((item) => [item.code, item.name]);

      // Verify builder returns itself for chaining
      assert.ok(builder instanceof SeederBuilder);

      db.close();
    });

    it("should allow method calls in any order", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        )
      `);

      const testData: TestEntity[] = [{ code: "TEST1", name: "Test One" }];

      // Different order of method calls
      const count = new SeederBuilder<TestEntity>(db)
        .data(testData)
        .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
        .entity("test entities")
        .mapToValues((item) => [item.code, item.name])
        .seed();

      assert.strictEqual(count, 1);

      db.close();
    });
  });

  describe("basic seeding", () => {
    it("should seed data without foreign keys", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
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

      const count = new SeederBuilder<TestEntity>(db)
        .entity("test entities")
        .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
        .data(testData)
        .mapToValues((item) => [item.code, item.name])
        .seed();

      assert.strictEqual(count, 3);

      const result = db.prepare("SELECT COUNT(*) as count FROM test").get() as { count: number };
      assert.strictEqual(result.count, 3);

      db.close();
    });

    it("should be idempotent with INSERT OR REPLACE", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        )
      `);

      const testData: TestEntity[] = [{ code: "TEST1", name: "Test One" }];

      const builder = () =>
        new SeederBuilder<TestEntity>(db)
          .entity("test entities")
          .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
          .data(testData)
          .mapToValues((item) => [item.code, item.name]);

      const count1 = builder().seed();
      const count2 = builder().seed();

      assert.strictEqual(count1, 1);
      assert.strictEqual(count2, 1);

      const result = db.prepare("SELECT COUNT(*) as count FROM test").get() as { count: number };
      assert.strictEqual(result.count, 1);

      db.close();
    });

    it("should handle empty data array", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        )
      `);

      const count = new SeederBuilder<TestEntity>(db)
        .entity("test entities")
        .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
        .data([])
        .mapToValues((item) => [item.code, item.name])
        .seed();

      assert.strictEqual(count, 0);

      db.close();
    });
  });

  describe("foreign key resolution", () => {
    it("should resolve single foreign key", () => {
      const db = new DatabaseSync(":memory:");

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

      db.prepare("INSERT INTO parent (code, name) VALUES (?, ?)").run("PARENT1", "Parent One");

      const childData: TestEntityWithFK[] = [
        { code: "CHILD1", name: "Child One", parentCode: "PARENT1" },
      ];

      const count = new SeederBuilder<TestEntityWithFK>(db)
        .entity("child entities")
        .sql("INSERT OR REPLACE INTO child (code, name, parent_id) VALUES (?, ?, ?)")
        .data(childData)
        .resolveForeignKey({
          targetField: "parent_id",
          table: "parent",
          valueColumn: "id",
          filterColumn: "code",
          sourceFieldExtractor: (item) => item.parentCode,
        })
        .mapToValues((item) => [
          item.code,
          item.name,
          (item as unknown as Record<string, number>).parent_id,
        ])
        .seed();

      assert.strictEqual(count, 1);

      const result = db.prepare("SELECT * FROM child WHERE code = ?").get("CHILD1") as Record<
        string,
        string | number
      >;
      assert.strictEqual(result.code, "CHILD1");
      assert.strictEqual(result.parent_id, 1);

      db.close();
    });

    it("should resolve multiple foreign keys", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE category (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        );
        
        CREATE TABLE region (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        );
        
        CREATE TABLE product (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category_id INTEGER NOT NULL,
          region_id INTEGER NOT NULL,
          FOREIGN KEY (category_id) REFERENCES category(id),
          FOREIGN KEY (region_id) REFERENCES region(id)
        )
      `);

      db.exec("PRAGMA foreign_keys = ON");

      db.prepare("INSERT INTO category (code, name) VALUES (?, ?)").run("CAT1", "Category One");
      db.prepare("INSERT INTO region (code, name) VALUES (?, ?)").run("REG1", "Region One");

      interface ProductData {
        code: string;
        name: string;
        categoryCode: string;
        regionCode: string;
      }

      const productData: ProductData[] = [
        { code: "PROD1", name: "Product One", categoryCode: "CAT1", regionCode: "REG1" },
      ];

      const count = new SeederBuilder<ProductData>(db)
        .entity("products")
        .sql(
          "INSERT OR REPLACE INTO product (code, name, category_id, region_id) VALUES (?, ?, ?, ?)"
        )
        .data(productData)
        .resolveForeignKey({
          targetField: "category_id",
          table: "category",
          valueColumn: "id",
          filterColumn: "code",
          sourceFieldExtractor: (item) => item.categoryCode,
        })
        .resolveForeignKey({
          targetField: "region_id",
          table: "region",
          valueColumn: "id",
          filterColumn: "code",
          sourceFieldExtractor: (item) => item.regionCode,
        })
        .mapToValues((item) => [
          item.code,
          item.name,
          (item as unknown as Record<string, number>).category_id,
          (item as unknown as Record<string, number>).region_id,
        ])
        .seed();

      assert.strictEqual(count, 1);

      const result = db.prepare("SELECT * FROM product WHERE code = ?").get("PROD1") as Record<
        string,
        string | number
      >;
      assert.strictEqual(result.category_id, 1);
      assert.strictEqual(result.region_id, 1);

      db.close();
    });

    it("should throw error when foreign key not found", () => {
      const db = new DatabaseSync(":memory:");

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
          parent_id INTEGER NOT NULL
        )
      `);

      db.prepare("INSERT INTO parent (code, name) VALUES (?, ?)").run("PARENT1", "Parent One");

      const childData: TestEntityWithFK[] = [
        { code: "CHILD1", name: "Child One", parentCode: "NONEXISTENT" },
      ];

      assert.throws(
        () => {
          new SeederBuilder<TestEntityWithFK>(db)
            .entity("child entities")
            .sql("INSERT OR REPLACE INTO child (code, name, parent_id) VALUES (?, ?, ?)")
            .data(childData)
            .resolveForeignKey({
              targetField: "parent_id",
              table: "parent",
              valueColumn: "id",
              filterColumn: "code",
              sourceFieldExtractor: (item) => item.parentCode,
            })
            .mapToValues((item) => [
              item.code,
              item.name,
              (item as unknown as Record<string, number>).parent_id,
            ])
            .seed();
        },
        {
          name: "Error",
          message: "parent: code='NONEXISTENT' not found",
        }
      );

      db.close();
    });
  });

  describe("validation", () => {
    it("should throw error if entity name not set", () => {
      const db = new DatabaseSync(":memory:");

      assert.throws(
        () => {
          new SeederBuilder<TestEntity>(db)
            .sql("INSERT INTO test (code, name) VALUES (?, ?)")
            .data([{ code: "TEST1", name: "Test One" }])
            .mapToValues((item) => [item.code, item.name])
            .seed();
        },
        {
          name: "Error",
          message: "SeederBuilder: entity name is required. Call .entity() first.",
        }
      );

      db.close();
    });

    it("should throw error if SQL statement not set", () => {
      const db = new DatabaseSync(":memory:");

      assert.throws(
        () => {
          new SeederBuilder<TestEntity>(db)
            .entity("test entities")
            .data([{ code: "TEST1", name: "Test One" }])
            .mapToValues((item) => [item.code, item.name])
            .seed();
        },
        {
          name: "Error",
          message: "SeederBuilder: SQL statement is required. Call .sql() first.",
        }
      );

      db.close();
    });

    it("should throw error if data not set", () => {
      const db = new DatabaseSync(":memory:");

      assert.throws(
        () => {
          new SeederBuilder<TestEntity>(db)
            .entity("test entities")
            .sql("INSERT INTO test (code, name) VALUES (?, ?)")
            .mapToValues((item) => [item.code, item.name])
            .seed();
        },
        {
          name: "Error",
          message: "SeederBuilder: data is required. Call .data() first.",
        }
      );

      db.close();
    });

    it("should throw error if value mapper not set", () => {
      const db = new DatabaseSync(":memory:");

      assert.throws(
        () => {
          new SeederBuilder<TestEntity>(db)
            .entity("test entities")
            .sql("INSERT INTO test (code, name) VALUES (?, ?)")
            .data([{ code: "TEST1", name: "Test One" }])
            .seed();
        },
        {
          name: "Error",
          message: "SeederBuilder: value mapper is required. Call .mapToValues() first.",
        }
      );

      db.close();
    });
  });

  describe("performance", () => {
    it("should handle large datasets efficiently", () => {
      const db = new DatabaseSync(":memory:");

      db.exec(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        )
      `);

      const testData: TestEntity[] = Array.from({ length: 1000 }, (_, i) => ({
        code: `TEST${i + 1}`,
        name: `Test ${i + 1}`,
      }));

      const count = new SeederBuilder<TestEntity>(db)
        .entity("test entities")
        .sql("INSERT OR REPLACE INTO test (code, name) VALUES (?, ?)")
        .data(testData)
        .mapToValues((item) => [item.code, item.name])
        .seed();

      assert.strictEqual(count, 1000);

      const result = db.prepare("SELECT COUNT(*) as count FROM test").get() as { count: number };
      assert.strictEqual(result.count, 1000);

      db.close();
    });
  });
});
