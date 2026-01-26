import { db } from "../db.js";
import { currencies } from "./currencies.js";

/**
 * Seeds the database with master data.
 * This function is idempotent - it can be run multiple times safely.
 */
export function seedDatabase(): void {
  console.log("Starting database seeding...");

  // Seed currencies
  console.log("Seeding currencies...");
  const currencyStmt = db.prepare(`
        INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

  let currencyCount = 0;
  for (const currency of currencies) {
    currencyStmt.run(
      currency.currency_id,
      currency.name,
      currency.code3,
      currency.code2,
      currency.currency_symbol,
      currency.decimal_digits
    );
    currencyCount++;
  }

  console.log(`✓ Seeded ${currencyCount} currencies`);
  console.log("Database seeding completed successfully!");
}
