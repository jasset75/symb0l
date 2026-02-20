import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

// Import all seed data
import { instruments } from "./instruments.js";
import { profiles } from "./profiles.js";
import { riskLevels } from "./risk_levels.js";
import { assetClassLevels } from "./asset_class_levels.js";
import { marketCaps } from "./market_caps.js";
import { sectors } from "./sectors.js";
import { subIndustries } from "./sub_industries.js";
import { countryExposures } from "./country_exposures.js";
import { SeederBuilder } from "./lib/SeederBuilder.js";

// Re-use logic from index.ts by importing the SeederBuilder or rewriting the small logic here?
// Since index.ts exports `seedDatabase` which uses the Global `db` instance, we can't easily reuse it for a test instance.
// We will reuse the SeederBuilder and replicate the seeding logic in the test setup.

describe("Metadata Seeds Integration Tests", () => {
  let testDb: DatabaseSync;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.resolve(
      `test-symb0l-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );

    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new DatabaseSync(testDbPath);
    testDb.exec("PRAGMA foreign_keys = ON;");

    // Initialize Schema (replicated from db.ts)
    const schema = `
        CREATE TABLE IF NOT EXISTS country (country_code TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS market (
            market_id INTEGER PRIMARY KEY AUTOINCREMENT,
            mic_code TEXT NOT NULL UNIQUE,
            ticker_prefix TEXT,
            name TEXT NOT NULL,
            title TEXT,
            country_code TEXT NOT NULL,
            timezone TEXT,
            FOREIGN KEY (country_code) REFERENCES country(country_code)
        );
        CREATE TABLE IF NOT EXISTS instrument (
            instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
            isin TEXT UNIQUE,
            name TEXT NOT NULL,
            instrument_type TEXT NOT NULL,
            profile_id INTEGER,
            risk_level_id INTEGER,
            asset_class_level_id INTEGER,
            market_cap_id INTEGER,
            sector_id INTEGER,
            sub_industry_id INTEGER,
            country_exposure_id INTEGER,
            FOREIGN KEY (profile_id) REFERENCES profile(profile_id),
            FOREIGN KEY (risk_level_id) REFERENCES risk_level(risk_level_id),
            FOREIGN KEY (asset_class_level_id) REFERENCES asset_class_level(asset_class_level_id),
            FOREIGN KEY (market_cap_id) REFERENCES market_cap(market_cap_id),
            FOREIGN KEY (sector_id) REFERENCES sector(sector_id),
            FOREIGN KEY (sub_industry_id) REFERENCES sub_industry(sub_industry_id),
            FOREIGN KEY (country_exposure_id) REFERENCES country_exposure(country_exposure_id)
        );
        CREATE TABLE IF NOT EXISTS profile (profile_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS risk_level (risk_level_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, weight INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS asset_class_level (asset_class_level_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT);
        CREATE TABLE IF NOT EXISTS market_cap (market_cap_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS sector (sector_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT);
        CREATE TABLE IF NOT EXISTS sub_industry (sub_industry_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS country_exposure (country_exposure_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    `;
    testDb.exec(schema);
  });

  afterEach(() => {
    try {
      testDb.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  function seedAllMetadata() {
    // Masters

    new SeederBuilder<(typeof profiles)[number]>(testDb)
      .entity("profiles")
      .sql("INSERT OR REPLACE INTO profile (profile_id, name) VALUES (?, ?)")
      .data(profiles)
      .mapToValues((i) => [i.profile_id, i.name])
      .seed();
    new SeederBuilder<(typeof riskLevels)[number]>(testDb)
      .entity("risk_levels")
      .sql("INSERT OR REPLACE INTO risk_level (risk_level_id, name, weight) VALUES (?, ?, ?)")
      .data(riskLevels)
      .mapToValues((i) => [i.risk_level_id, i.name, i.weight])
      .seed();
    new SeederBuilder<(typeof assetClassLevels)[number]>(testDb)
      .entity("asset_class_levels")
      .sql(
        "INSERT OR REPLACE INTO asset_class_level (asset_class_level_id, name, description) VALUES (?, ?, ?)"
      )
      .data(assetClassLevels)
      .mapToValues((i) => [i.asset_class_level_id, i.name, i.description])
      .seed();
    new SeederBuilder<(typeof marketCaps)[number]>(testDb)
      .entity("market_caps")
      .sql("INSERT OR REPLACE INTO market_cap (market_cap_id, name) VALUES (?, ?)")
      .data(marketCaps)
      .mapToValues((i) => [i.market_cap_id, i.name])
      .seed();
    new SeederBuilder<(typeof sectors)[number]>(testDb)
      .entity("sectors")
      .sql("INSERT OR REPLACE INTO sector (sector_id, name, description) VALUES (?, ?, ?)")
      .data(sectors)
      .mapToValues((i) => [i.sector_id, i.name, i.description])
      .seed();
    new SeederBuilder<(typeof subIndustries)[number]>(testDb)
      .entity("sub_industries")
      .sql("INSERT OR REPLACE INTO sub_industry (sub_industry_id, name) VALUES (?, ?)")
      .data(subIndustries)
      .mapToValues((i) => [i.sub_industry_id, i.name])
      .seed();
    new SeederBuilder<(typeof countryExposures)[number]>(testDb)
      .entity("country_exposures")
      .sql("INSERT OR REPLACE INTO country_exposure (country_exposure_id, name) VALUES (?, ?)")
      .data(countryExposures)
      .mapToValues((i) => [i.country_exposure_id, i.name])
      .seed();

    // Instruments
    // Instruments
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
      profile_id?: number | null;
      risk_level_id?: number | null;
      asset_class_level_id?: number | null;
      market_cap_id?: number | null;
      sector_id?: number | null;
      sub_industry_id?: number | null;
      country_exposure_id?: number | null;
    }

    new SeederBuilder<SeedInstrument>(testDb)
      .entity("instruments")
      .sql(
        `INSERT OR REPLACE INTO instrument (
            instrument_id, isin, name, instrument_type,
            profile_id, risk_level_id, asset_class_level_id, market_cap_id,
            sector_id, sub_industry_id, country_exposure_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .data(instruments)
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
        instrument.instrument_type,
        instrument.profile_id || null,
        instrument.risk_level_id || null,
        instrument.asset_class_level_id || null,
        instrument.market_cap_id || null,
        instrument.sector_id || null,
        instrument.sub_industry_id || null,
        instrument.country_exposure_id || null,
      ])
      .seed();
  }

  it("should have correct metadata for Acerinox", () => {
    seedAllMetadata();

    const result = testDb
      .prepare(
        `
        SELECT 
            i.name, 
            p.name as profile, 
            r.name as risk_level,
            a.name as asset_class_level,
            m.name as market_cap,
            s.name as sector,
            si.name as sub_industry,
            ce.name as country_exposure
        FROM instrument i
        LEFT JOIN profile p ON i.profile_id = p.profile_id
        LEFT JOIN risk_level r ON i.risk_level_id = r.risk_level_id
        LEFT JOIN asset_class_level a ON i.asset_class_level_id = a.asset_class_level_id
        LEFT JOIN market_cap m ON i.market_cap_id = m.market_cap_id
        LEFT JOIN sector s ON i.sector_id = s.sector_id
        LEFT JOIN sub_industry si ON i.sub_industry_id = si.sub_industry_id
        LEFT JOIN country_exposure ce ON i.country_exposure_id = ce.country_exposure_id
        WHERE i.name LIKE 'ACERINOX%'
    `
      )
      .get() as {
      name: string;
      profile: string;
      risk_level: string;
      asset_class_level: string;
      market_cap: string;
      sector: string;
      sub_industry: string;
      country_exposure: string;
    };

    assert.ok(result, "Acerinox should exist");
    assert.strictEqual(result.profile, "Cyclical");
    assert.strictEqual(result.risk_level, "Moderate");
    assert.strictEqual(result.asset_class_level, "Mature");
    assert.strictEqual(result.market_cap, "Mid Cap");
    assert.strictEqual(result.sector, "Materials");
    assert.strictEqual(result.sub_industry, "Steel");
    assert.strictEqual(result.country_exposure, "Global");
  });

  it("should seed all master tables", () => {
    seedAllMetadata();

    const counts = [
      { table: "profile", expected: profiles.length },
      { table: "risk_level", expected: riskLevels.length },
      { table: "sector", expected: sectors.length },
    ];

    for (const check of counts) {
      const res = testDb.prepare(`SELECT COUNT(*) as count FROM ${check.table}`).get() as {
        count: number;
      };
      assert.strictEqual(res.count, check.expected, `${check.table} count mismatch`);
    }
  });
});
