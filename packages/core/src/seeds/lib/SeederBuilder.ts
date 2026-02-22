import type { DatabaseSync } from "node:sqlite";

/**
 * Valid SQLite value types for node:sqlite
 */
type SqliteValue = string | number | null;

/**
 * Foreign key resolution configuration
 */
interface ForeignKeyFilter<T> {
  column: string;
  valueExtractor: (item: T) => SqliteValue;
}

/**
 * Foreign key resolution configuration
 */
interface ForeignKeyResolution<T> {
  // Lookup: Where to search
  table: string;
  valueColumn: string;
  filters: ForeignKeyFilter<T>[];

  // Output: Where to store the result
  targetField: string;

  // Optional: If true, returns null instead of throwing when not found
  optional?: boolean;
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
 *   .resolveForeignKey({
 *     table: "exchange",
 *     valueColumn: "exchange_id",
 *     filters: [{ column: "code", valueExtractor: (item) => item.exchange_code }],
 *     targetField: "exchange_id",
 *   })
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
   * @param config - Configuration object for foreign key resolution
   * @param config.table - Database table to query for the ID (e.g., 'currency')
   * @param config.valueColumn - Column name of the value to retrieve (e.g., 'currency_id')
   * @param config.filters - One or more filter descriptors for simple/composite key lookups
   * @param config.targetField - Field name where the resolved ID will be stored in the item (e.g., 'currency_id')
   * @param config.optional - If true, returns null if the lookup fails instead of throwing an error
   * @returns this builder instance for chaining
   *
   * @example
   * .resolveForeignKey({
   *   table: "market",
   *   valueColumn: "market_id",
   *   filters: [{ column: "ticker_prefix", valueExtractor: (item) => item.market_prefix }],
   *   targetField: "market_id",
   * })
   */
  resolveForeignKey(config: ForeignKeyResolution<T>): this {
    this.foreignKeyResolutions.push(config);
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
      const filters = resolution.filters.map((filter) => ({
        column: filter.column,
        value: filter.valueExtractor(result as T),
      }));

      // If any source value is null/empty and optional, skip lookup
      const hasEmptyFilterValue = filters.some(
        (filter) => filter.value === null || filter.value === ""
      );
      if (hasEmptyFilterValue && resolution.optional) {
        result[resolution.targetField] = null;
        continue;
      }

      if (filters.some((filter) => filter.value === null || filter.value === undefined)) {
        throw new Error(
          `SeederBuilder: Source value for ${resolution.table} lookup is null/undefined, but not marked optional.`
        );
      }

      const resolvedId = this.resolveForeignKeyValue(
        resolution.table,
        resolution.valueColumn,
        resolution.optional,
        filters as { column: string; value: string | number }[]
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
    valueColumn: string,
    optional: boolean = false,
    filters: { column: string; value: string | number }[]
  ): SqliteValue {
    if (filters.length === 0) {
      throw new Error(`SeederBuilder: At least one filter is required for ${table} lookup.`);
    }

    const whereClause = filters.map((filter) => `${filter.column} = ?`).join(" AND ");
    const params = filters.map((filter) => filter.value);
    const result = this.db
      .prepare(`SELECT ${valueColumn} FROM ${table} WHERE ${whereClause}`)
      .get(...params) as Record<string, SqliteValue> | undefined;

    if (!result) {
      if (optional) {
        return null;
      }
      const keyDescription = filters.map((f) => `${f.column}='${f.value}'`).join(", ");
      throw new Error(`${table}: ${keyDescription} not found`);
    }

    if (!(valueColumn in result)) {
      throw new Error(`${table}: value column '${valueColumn}' not found in lookup result`);
    }

    return result[valueColumn];
  }
}
