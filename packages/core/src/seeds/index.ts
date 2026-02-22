import { db } from "../db.js";
import { SeederBuilder } from "./lib/SeederBuilder.js";
import { countries } from "./countries.js";
import { currencies } from "./currencies.js";
import { markets } from "./markets.js";
import { instrumentTypes } from "./instrument_types.js";
import { instruments } from "./instruments.js";
import { listings } from "./listings.js";
import { listingProviderSymbols } from "./listing_provider_symbols.js";
import { profiles } from "./profiles.js";
import { riskLevels } from "./risk_levels.js";
import { assetClassLevels } from "./asset_class_levels.js";
import { marketCaps } from "./market_caps.js";
import { sectors } from "./sectors.js";
import { subIndustries } from "./sub_industries.js";
import { countryExposures } from "./country_exposures.js";

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
      `INSERT INTO market (mic_code, ticker_prefix, name, title, country_code, timezone) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(mic_code) DO UPDATE SET
       ticker_prefix = excluded.ticker_prefix,
       name = excluded.name,
       title = excluded.title,
       country_code = excluded.country_code,
       timezone = excluded.timezone`
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

  // --- Metadata Tables Seeding ---

  new SeederBuilder<(typeof profiles)[number]>(db)
    .entity("profiles")
    .sql("INSERT OR REPLACE INTO profile (profile_id, name) VALUES (?, ?)")
    .data(profiles)
    .mapToValues((item) => [item.profile_id, item.name])
    .seed();

  new SeederBuilder<(typeof riskLevels)[number]>(db)
    .entity("risk_levels")
    .sql("INSERT OR REPLACE INTO risk_level (risk_level_id, name, weight) VALUES (?, ?, ?)")
    .data(riskLevels)
    .mapToValues((item) => [item.risk_level_id, item.name, item.weight])
    .seed();

  new SeederBuilder<(typeof assetClassLevels)[number]>(db)
    .entity("asset_class_levels")
    .sql(
      "INSERT OR REPLACE INTO asset_class_level (asset_class_level_id, name, description) VALUES (?, ?, ?)"
    )
    .data(assetClassLevels)
    .mapToValues((item) => [item.asset_class_level_id, item.name, item.description])
    .seed();

  new SeederBuilder<(typeof marketCaps)[number]>(db)
    .entity("market_caps")
    .sql("INSERT OR REPLACE INTO market_cap (market_cap_id, name) VALUES (?, ?)")
    .data(marketCaps)
    .mapToValues((item) => [item.market_cap_id, item.name])
    .seed();

  new SeederBuilder<(typeof sectors)[number]>(db)
    .entity("sectors")
    .sql("INSERT OR REPLACE INTO sector (sector_id, name, description) VALUES (?, ?, ?)")
    .data(sectors)
    .mapToValues((item) => [item.sector_id, item.name, item.description])
    .seed();

  new SeederBuilder<(typeof subIndustries)[number]>(db)
    .entity("sub_industries")
    .sql(
      "INSERT OR REPLACE INTO sub_industry (sub_industry_id, name, description) VALUES (?, ?, ?)"
    )
    .data(subIndustries)
    .mapToValues((item) => [item.sub_industry_id, item.name, item.description])
    .seed();

  new SeederBuilder<(typeof countryExposures)[number]>(db)
    .entity("country_exposures")
    .sql("INSERT OR REPLACE INTO country_exposure (country_exposure_id, name) VALUES (?, ?)")
    .data(countryExposures)
    .mapToValues((item) => [item.country_exposure_id, item.name])
    .seed();

  // Instrument Types
  new SeederBuilder<(typeof instrumentTypes)[number]>(db)
    .entity("instrument_types")
    .sql("INSERT OR REPLACE INTO instrument_type (instrument_type_id, name) VALUES (?, ?)")
    .data(instrumentTypes)
    .mapToValues((item) => [item.instrument_type_id, item.name])
    .seed();

  // --- Instrument Seeding (Updated with Metadata Resolution) ---

  interface SeedInstrument {
    instrument_id: number;
    isin: string | null;
    name: string;
    instrument_type: string;
    profile_name: string | null;
    risk_level_name: string | null;
    asset_class_level_name: string | null;
    market_cap_name: string | null;
    sector_name: string | null;
    sub_industry_name: string | null;
    country_exposure_name: string | null;
    // These will be resolved
    instrument_type_id?: number | null;
    profile_id?: number | null;
    risk_level_id?: number | null;
    asset_class_level_id?: number | null;
    market_cap_id?: number | null;
    sector_id?: number | null;
    sub_industry_id?: number | null;
    country_exposure_id?: number | null;
  }

  new SeederBuilder<SeedInstrument>(db)
    .entity("instruments")
    .sql(
      `INSERT INTO instrument (
            instrument_id, isin, name, instrument_type_id,
            profile_id, risk_level_id, asset_class_level_id, market_cap_id,
            sector_id, sub_industry_id, country_exposure_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(instrument_id) DO UPDATE SET
            isin = excluded.isin,
            name = excluded.name,
            instrument_type_id = excluded.instrument_type_id,
            profile_id = excluded.profile_id,
            risk_level_id = excluded.risk_level_id,
            asset_class_level_id = excluded.asset_class_level_id,
            market_cap_id = excluded.market_cap_id,
            sector_id = excluded.sector_id,
            sub_industry_id = excluded.sub_industry_id,
            country_exposure_id = excluded.country_exposure_id`
    )
    .data(instruments)
    // Resolvers for Metadata
    .resolveForeignKey({
      table: "instrument_type",
      valueColumn: "instrument_type_id",
      filters: [{ column: "name", valueExtractor: (item) => item.instrument_type }],
      targetField: "instrument_type_id",
    })
    .resolveForeignKey({
      table: "profile",
      valueColumn: "profile_id",
      filters: [{ column: "name", valueExtractor: (item) => item.profile_name || "" }],
      targetField: "profile_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "risk_level",
      valueColumn: "risk_level_id",
      filters: [{ column: "name", valueExtractor: (item) => item.risk_level_name || "" }],
      targetField: "risk_level_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "asset_class_level",
      valueColumn: "asset_class_level_id",
      filters: [{ column: "name", valueExtractor: (item) => item.asset_class_level_name || "" }],
      targetField: "asset_class_level_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "market_cap",
      valueColumn: "market_cap_id",
      filters: [{ column: "name", valueExtractor: (item) => item.market_cap_name || "" }],
      targetField: "market_cap_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "sector",
      valueColumn: "sector_id",
      filters: [{ column: "name", valueExtractor: (item) => item.sector_name || "" }],
      targetField: "sector_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "sub_industry",
      valueColumn: "sub_industry_id",
      filters: [{ column: "name", valueExtractor: (item) => item.sub_industry_name || "" }],
      targetField: "sub_industry_id",
      optional: true,
    })
    .resolveForeignKey({
      table: "country_exposure",
      valueColumn: "country_exposure_id",
      filters: [{ column: "name", valueExtractor: (item) => item.country_exposure_name || "" }],
      targetField: "country_exposure_id",
      optional: true,
    })
    .mapToValues((instrument: SeedInstrument) => [
      instrument.instrument_id,
      instrument.isin || null,
      instrument.name,
      instrument.instrument_type_id || null,
      instrument.profile_id || null,
      instrument.risk_level_id || null,
      instrument.asset_class_level_id || null,
      instrument.market_cap_id || null,
      instrument.sector_id || null,
      instrument.sub_industry_id || null,
      instrument.country_exposure_id || null,
    ])
    .seed();

  // Seed listings (links instruments to markets)
  new SeederBuilder<(typeof listings)[number]>(db)
    .entity("listings")
    .sql(
      `INSERT OR REPLACE INTO listing (market_id, instrument_id, symbol_code, currency_id, listing_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .data(listings)
    // Resolve market_id from market table using ticker_prefix (e.g., NASDAQ)
    .resolveForeignKey({
      table: "market",
      valueColumn: "market_id",
      filters: [{ column: "ticker_prefix", valueExtractor: (item) => item.market_prefix }],
      targetField: "market_id",
    })
    // Resolve instrument_id from instrument table using isin
    .resolveForeignKey({
      table: "instrument",
      valueColumn: "instrument_id",
      filters: [{ column: "isin", valueExtractor: (item) => item.isin }],
      targetField: "instrument_id",
    })
    // Resolve currency_id from currency table using code3 (e.g., USD)
    .resolveForeignKey({
      table: "currency",
      valueColumn: "currency_id",
      filters: [{ column: "code3", valueExtractor: (item) => item.currency_code }],
      targetField: "currency_id",
    })
    .mapToValues((item) => [
      // @ts-expect-error - market_id injected by resolveForeignKey
      item.market_id,
      // @ts-expect-error - instrument_id injected by resolveForeignKey
      item.instrument_id,
      item.symbol_code,
      // @ts-expect-error - currency_id injected by resolveForeignKey
      item.currency_id,
      // Let SQLite auto-generate listing_id (or we could map it if we had stable IDs)
      null,
    ])
    .seed();

  // Seed provider-specific listing symbols (non-redundant mappings only)
  new SeederBuilder<(typeof listingProviderSymbols)[number]>(db)
    .entity("listing_provider_symbols")
    .sql(
      `INSERT INTO listing_provider_symbol (listing_id, provider, provider_symbol)
       VALUES (?, ?, ?)
       ON CONFLICT(listing_id, provider) DO UPDATE SET
       provider_symbol = excluded.provider_symbol,
       updated_at = CURRENT_TIMESTAMP`
    )
    .data(listingProviderSymbols)
    .resolveForeignKey({
      table: "market",
      valueColumn: "market_id",
      filters: [{ column: "ticker_prefix", valueExtractor: (item) => item.market_prefix }],
      targetField: "market_id",
    })
    .resolveForeignKey({
      table: "listing",
      valueColumn: "listing_id",
      filters: [
        { column: "symbol_code", valueExtractor: (item) => item.symbol_code },
        {
          column: "market_id",
          valueExtractor: (item) => (item as unknown as Record<string, number>).market_id,
        },
      ],
      targetField: "listing_id",
    })
    .mapToValues((item) => [
      (item as unknown as Record<string, number>).listing_id,
      item.provider,
      item.provider_symbol,
    ])
    .seed();

  console.log("Database seeding completed successfully!");
}
