import { currencies } from "./currencies.js";
import { exchanges } from "./exchanges.js";
import { seed, type SeederConfig } from "./seeder.js";
import type { CurrencyData } from "./currencies.js";
import type { ExchangeData } from "./exchanges.js";

/**
 * Seeds the database with master data.
 * This function is idempotent - it can be run multiple times safely.
 */
export function seedDatabase(): void {
  console.log("Starting database seeding...");

  // Seed exchanges
  const exchangeConfig: SeederConfig<ExchangeData> = {
    entityName: "exchanges",
    sql: "INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)",
    data: exchanges,
    mapToValues: (exchange) => [exchange.code, exchange.name],
  };
  seed(exchangeConfig);

  // Seed currencies
  const currencyConfig: SeederConfig<CurrencyData> = {
    entityName: "currencies",
    sql: `INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
          VALUES (?, ?, ?, ?, ?, ?)`,
    data: currencies,
    mapToValues: (currency) => [
      currency.currency_id,
      currency.name,
      currency.code3,
      currency.code2,
      currency.currency_symbol,
      currency.decimal_digits,
    ],
  };
  seed(currencyConfig);

  console.log("Database seeding completed successfully!");
}
