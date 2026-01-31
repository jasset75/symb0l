import { db } from "../db.js";
import { SeederBuilder } from "./lib/SeederBuilder.js";
import { countries } from "./countries.js";
import { currencies } from "./currencies.js";
import { markets } from "./markets.js";
import { instruments } from "./instruments.js";
import { listings } from "./listings.js";

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

  // Seed instruments (foundational asset data)
  new SeederBuilder<(typeof instruments)[number]>(db)
    .entity("instruments")
    .sql(
      `INSERT OR REPLACE INTO instrument (instrument_id, isin, name, instrument_type)
       VALUES (?, ?, ?, ?)`
    )
    .data(instruments)
    .mapToValues((instrument) => [
      instrument.instrument_id,
      instrument.isin || null,
      instrument.name,
      instrument.instrument_type,
    ])
    .seed();

  // Seed listings (links instruments to markets)
  new SeederBuilder<(typeof listings)[number]>(db)
    .entity("listings")
    .sql(
      `INSERT OR REPLACE INTO listing (market_id, instrument_id, symbol_code, display_ticker, currency_id, listing_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .data(listings)
    // Resolve market_id from market table using ticker_prefix (e.g., NASDAQ)
    .resolveForeignKey({
      sourceFieldExtractor: (item) => item.market_prefix,
      table: "market",
      filterColumn: "ticker_prefix",
      valueColumn: "market_id",
      targetField: "market_id",
    })
    // Resolve instrument_id from instrument table using isin
    .resolveForeignKey({
      sourceFieldExtractor: (item) => item.isin,
      table: "instrument",
      filterColumn: "isin",
      valueColumn: "instrument_id",
      targetField: "instrument_id",
    })
    // Resolve currency_id from currency table using code3 (e.g., USD)
    .resolveForeignKey({
      sourceFieldExtractor: (item) => item.currency_code,
      table: "currency",
      filterColumn: "code3",
      valueColumn: "currency_id",
      targetField: "currency_id",
    })
    .mapToValues((item) => [
      // @ts-expect-error - market_id injected by resolveForeignKey
      item.market_id,
      // @ts-expect-error - instrument_id injected by resolveForeignKey
      item.instrument_id,
      item.symbol_code,
      item.display_ticker,
      // @ts-expect-error - currency_id injected by resolveForeignKey
      item.currency_id,
      // Let SQLite auto-generate listing_id (or we could map it if we had stable IDs)
      null,
    ])
    .seed();

  console.log("Database seeding completed successfully!");
}
