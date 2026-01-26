import { db } from "../db.js";

/**
 * Foreign Key Resolver Helper
 *
 * Provides a clean, reusable way to resolve foreign keys
 * when seeding entities with dependencies.
 */

/**
 * Generic foreign key resolver
 *
 * @param table - Table name to query
 * @param idColumn - ID column name to return
 * @param whereColumn - Column to filter by
 * @param whereValue - Value to match
 * @returns The resolved ID
 * @throws Error if not found
 *
 * @example
 * // Resolve exchange_id from exchange code
 * const exchangeId = resolveForeignKey("exchange", "exchange_id", "code", "EURONEXT");
 *
 * @example
 * // Resolve market_id from market code
 * const marketId = resolveForeignKey("market", "market_id", "code", "EPA");
 */
export function resolveForeignKey(
  table: string,
  idColumn: string,
  whereColumn: string,
  whereValue: string | number
): number {
  const result = db
    .prepare(`SELECT ${idColumn} FROM ${table} WHERE ${whereColumn} = ?`)
    .get(whereValue) as Record<string, number> | undefined;

  if (!result) {
    throw new Error(`${table}: ${whereColumn}='${whereValue}' not found`);
  }

  return result[idColumn];
}
