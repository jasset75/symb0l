import { db } from "../db.js";
import { SeederBuilder } from "./lib/SeederBuilder.js";
import { countries } from "./countries.js";
import { currencies } from "./currencies.js";
import { markets } from "./markets.js";

/**
 * Seeds the database with master data.
 * This function is idempotent - it can be run multiple times safely.
 */
export function seedDatabase(): void {
  console.log("Starting database seeding...");

  // Seed countries (no dependencies - ISO 3166-1 alpha-2)
  new SeederBuilder<(typeof countries)[number]>(db)
    .entity("countries")
    .sql(
      `INSERT OR REPLACE INTO country (country_code, name) 
       VALUES (?, ?)`
    )
    .data(countries)
    .mapToValues((country) => [country.country_code, country.name])
    .seed();

  // Seed markets (depends on countries - MIC-based with ticker prefix)
  new SeederBuilder<(typeof markets)[number]>(db)
    .entity("markets")
    .sql(
      `INSERT OR REPLACE INTO market (mic_code, ticker_prefix, name, title, country_code, timezone) 
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .data(markets)
    .mapToValues((market) => [
      market.mic_code,
      market.ticker_prefix,
      market.name,
      market.title,
      market.country_code,
      market.timezone,
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
