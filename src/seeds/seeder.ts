import { db } from "../db.js";

/**
 * Valid SQLite value types for node:sqlite
 * Matches the SQLInputValue type from node:sqlite module
 */
type SqliteValue = string | number | null;

/**
 * Seeder Configuration Interface
 * Defines the contract for each seed entity
 */
export interface SeederConfig<T> {
  /** Name of the entity being seeded (for logging) */
  entityName: string;

  /** SQL INSERT OR REPLACE statement */
  sql: string;

  /** Array of seed data */
  data: T[];

  /**
   * Maps a data object to an array of values matching the SQL placeholders
   * @param item - The data object to map
   * @returns Array of values in the order expected by the SQL statement
   */
  mapToValues: (item: T) => SqliteValue[];
}

/**
 * Generic Seeder
 * Implements the seeding logic for any entity type
 *
 * @param config - Seeder configuration
 * @returns Number of records seeded
 */
export function seed<T>(config: SeederConfig<T>): number {
  console.log(`Seeding ${config.entityName}...`);

  const stmt = db.prepare(config.sql);
  let count = 0;

  for (const item of config.data) {
    const values = config.mapToValues(item);
    stmt.run(...values);
    count++;
  }

  console.log(`✓ Seeded ${count} ${config.entityName}`);
  return count;
}
