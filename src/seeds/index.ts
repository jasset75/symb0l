import { db } from "../db.js";
import { currencies } from "./currencies.js";
import { exchanges } from "./exchanges.js";
import { markets } from "./markets.js";
import { seed, type SeederConfig } from "./seeder.js";
import { resolveForeignKey } from "./resolvers.js";
import type { CurrencyData } from "./currencies.js";
import type { ExchangeData } from "./exchanges.js";
import type { MarketData } from "./markets.js";

/**
 * Seeds the database with master data.
 * This function is idempotent - it can be run multiple times safely.
 */
export function seedDatabase(): void {
  console.log("Starting database seeding...");

  // Seed exchanges (no dependencies)
  const exchangeConfig: SeederConfig<ExchangeData> = {
    entityName: "exchanges",
    sql: "INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)",
    data: exchanges,
    mapToValues: (exchange) => [exchange.code, exchange.name],
  };
  seed(exchangeConfig);

  // Seed markets (depends on exchanges)
  const marketConfig: SeederConfig<MarketData> = {
    entityName: "markets",
    sql: "INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)",
    data: markets,
    transform: (market) => ({
      exchange_id: resolveForeignKey("exchange", "exchange_id", "code", market.exchange_code),
      code: market.code,
      name: market.name,
    }),
    mapToValues: (transformed) => [
      (transformed as unknown as { exchange_id: number }).exchange_id,
      (transformed as unknown as { code: string }).code,
      (transformed as unknown as { name: string }).name,
    ],
  };
  seed(marketConfig);

  // Seed currencies (no dependencies)
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
