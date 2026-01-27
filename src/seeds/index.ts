import { db } from "../db.js";
import { SeederBuilder } from "./lib/SeederBuilder.js";
import { currencies } from "./currencies.js";
import { exchanges } from "./exchanges.js";
import { markets } from "./markets.js";

/**
 * Seeds the database with master data.
 * This function is idempotent - it can be run multiple times safely.
 */
export function seedDatabase(): void {
  console.log("Starting database seeding...");

  // Seed exchanges (no dependencies)
  new SeederBuilder<(typeof exchanges)[number]>(db)
    .entity("exchanges")
    .sql("INSERT OR REPLACE INTO exchange (code, name) VALUES (?, ?)")
    .data(exchanges)
    .mapToValues((exchange) => [exchange.code, exchange.name])
    .seed();

  // Seed markets (depends on exchanges)
  new SeederBuilder<(typeof markets)[number]>(db)
    .entity("markets")
    .sql("INSERT OR REPLACE INTO market (exchange_id, code, name) VALUES (?, ?, ?)")
    .data(markets)
    .resolveForeignKey(
      "exchange_id",
      "exchange",
      "exchange_id",
      "code",
      (market) => market.exchange_code
    )
    .mapToValues((market) => [
      (market as unknown as Record<string, number>).exchange_id,
      market.code,
      market.name,
    ])
    .seed();

  // Seed currencies (no dependencies)
  new SeederBuilder<(typeof currencies)[number]>(db)
    .entity("currencies")
    .sql(
      `INSERT OR REPLACE INTO currency (currency_id, name, code3, code2, currency_symbol, decimal_digits)
          VALUES (?, ?, ?, ?, ?, ?)`
    )
    .data(currencies)
    .mapToValues((currency) => [
      currency.currency_id,
      currency.name,
      currency.code3,
      currency.code2,
      currency.currency_symbol,
      currency.decimal_digits,
    ])
    .seed();

  console.log("Database seeding completed successfully!");
}
