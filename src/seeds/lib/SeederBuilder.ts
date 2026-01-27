import type { DatabaseSync } from "node:sqlite";

/**
 * Valid SQLite value types for node:sqlite
 */
type SqliteValue = string | number | null;

/**
 * Foreign key resolution configuration
 */
interface ForeignKeyResolution<T> {
  targetField: string;
  table: string;
  idColumn: string;
  whereColumn: string;
  sourceFieldExtractor: (item: T) => string | number;
}

/**
 * SeederBuilder - Fluent API for database seeding with foreign key resolution
 *
 * Implements the Builder Pattern to provide a clean, expressive API for seeding
 * database tables with automatic foreign key resolution.
 *
 * @example
 * // Simple seeding without foreign keys
 * new SeederBuilder(db)
 *   .entity("exchanges")
 *   .sql("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)")
 *   .data(exchanges)
 *   .mapToValues((item) => [item.code, item.name])
 *   .seed();
 *
 * @example
 * // Seeding with foreign key resolution
 * new SeederBuilder(db)
 *   .entity("markets")
 *   .sql("INSERT OR REPLACE INTO market (code, name, exchange_id) VALUES (?, ?, ?)")
 *   .data(markets)
 *   .resolveForeignKey("exchange_id", "exchange", "exchange_id", "code", (item) => item.exchange_code)
 *   .mapToValues((item) => [item.code, item.name, item.exchange_id])
 *   .seed();
 */
export class SeederBuilder<T extends object> {
  private db: DatabaseSync;
  private entityName?: string;
  private sqlStatement?: string;
  private seedData?: T[];
  private foreignKeyResolutions: ForeignKeyResolution<T>[] = [];
  private valueMapper?: (item: T) => SqliteValue[];

  /**
   * Creates a new SeederBuilder instance
   * @param db - Database instance (dependency injection)
   */
  constructor(db: DatabaseSync) {
    this.db = db;
  }

  /**
   * Sets the entity name for logging purposes
   * @param name - Name of the entity being seeded (e.g., "exchanges", "markets")
   * @returns this builder instance for chaining
   */
  entity(name: string): this {
    this.entityName = name;
    return this;
  }

  /**
   * Sets the SQL INSERT OR REPLACE statement
   * @param statement - SQL statement with placeholders (?)
   * @returns this builder instance for chaining
   */
  sql(statement: string): this {
    this.sqlStatement = statement;
    return this;
  }

  /**
   * Sets the data to be seeded
   * @param items - Array of data objects
   * @returns this builder instance for chaining
   */
  data(items: T[]): this {
    this.seedData = items;
    return this;
  }

  /**
   * Configures a foreign key resolution
   *
   * This method can be called multiple times to resolve multiple foreign keys.
   *
   * @param targetField - Field name where the resolved ID will be stored
   * @param table - Table to query for the foreign key
   * @param idColumn - Column name of the ID to retrieve
   * @param whereColumn - Column to filter by
   * @param sourceFieldExtractor - Function to extract the source value from the item
   * @returns this builder instance for chaining
   *
   * @example
   * .resolveForeignKey("exchange_id", "exchange", "exchange_id", "code", (item) => item.exchange_code)
   */
  resolveForeignKey(
    targetField: string,
    table: string,
    idColumn: string,
    whereColumn: string,
    sourceFieldExtractor: (item: T) => string | number
  ): this {
    this.foreignKeyResolutions.push({
      targetField,
      table,
      idColumn,
      whereColumn,
      sourceFieldExtractor,
    });
    return this;
  }

  /**
   * Sets the value mapper function
   *
   * This function maps the transformed data object to an array of values
   * matching the SQL statement placeholders.
   *
   * @param mapper - Function that maps an item to SQL values
   * @returns this builder instance for chaining
   */
  mapToValues(mapper: (item: T) => SqliteValue[]): this {
    this.valueMapper = mapper;
    return this;
  }

  /**
   * Executes the seeding operation
   *
   * @returns Number of records seeded
   * @throws Error if required configuration is missing
   */
  seed(): number {
    // Validate required configuration
    if (!this.entityName) {
      throw new Error("SeederBuilder: entity name is required. Call .entity() first.");
    }
    if (!this.sqlStatement) {
      throw new Error("SeederBuilder: SQL statement is required. Call .sql() first.");
    }
    if (!this.seedData) {
      throw new Error("SeederBuilder: data is required. Call .data() first.");
    }
    if (!this.valueMapper) {
      throw new Error("SeederBuilder: value mapper is required. Call .mapToValues() first.");
    }

    console.log(`Seeding ${this.entityName}...`);

    const stmt = this.db.prepare(this.sqlStatement);
    let count = 0;

    for (const item of this.seedData) {
      // Apply foreign key resolutions
      const transformedItem = this.applyForeignKeyResolutions(item);

      // Map to SQL values
      const values = this.valueMapper(transformedItem);

      // Execute insert
      stmt.run(...values);
      count++;
    }

    console.log(`✓ Seeded ${count} ${this.entityName}`);
    return count;
  }

  /**
   * Applies all configured foreign key resolutions to an item
   * @private
   */
  private applyForeignKeyResolutions(item: T): T {
    if (this.foreignKeyResolutions.length === 0) {
      return item;
    }

    // Create a copy of the item with resolved foreign keys
    const result: Record<string, unknown> = { ...(item as Record<string, unknown>) };

    for (const resolution of this.foreignKeyResolutions) {
      const sourceValue = resolution.sourceFieldExtractor(item);
      const resolvedId = this.resolveForeignKeyValue(
        resolution.table,
        resolution.idColumn,
        resolution.whereColumn,
        sourceValue
      );
      result[resolution.targetField] = resolvedId;
    }

    return result as T;
  }

  /**
   * Resolves a single foreign key value
   * @private
   */
  private resolveForeignKeyValue(
    table: string,
    idColumn: string,
    whereColumn: string,
    whereValue: string | number
  ): number {
    const result = this.db
      .prepare(`SELECT ${idColumn} FROM ${table} WHERE ${whereColumn} = ?`)
      .get(whereValue) as Record<string, number> | undefined;

    if (!result) {
      throw new Error(`${table}: ${whereColumn}='${whereValue}' not found`);
    }

    return result[idColumn];
  }
}
