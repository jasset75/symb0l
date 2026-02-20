import { db } from "../db.js";

export interface Listing {
  symbol_code: string;
  instrument_name: string;
  instrument_type: string;
  isin?: string;
  profile?: string;
  risk_level?: string;
  asset_class_level?: string;
  market_cap?: string;
  sector?: string;
  sub_industry?: string;
  country_exposure?: string;
  country_code?: string;
  currency_code?: string;
  [key: string]: unknown; // Allow other fields from view
}

export class ListingRepository {
  /**
   * Validates a list of symbols against the database.
   * Returns the list of symbols that were found in the database.
   */
  async validateSymbols(symbols: string[]): Promise<string[]> {
    if (symbols.length === 0) {
      return [];
    }

    // Create placeholders for the IN clause
    const placeholders = symbols.map(() => "?").join(",");
    const query = `
      SELECT DISTINCT symbol_code
      FROM listing 
      WHERE symbol_code IN (${placeholders})
    `;

    try {
      const statement = db.prepare(query);
      // node:sqlite `all` returns an array of objects
      const results = statement.all(...symbols) as { symbol_code: string }[];

      return results.map((row) => row.symbol_code);
    } catch (error) {
      console.error("Error validating symbols:", error);
      throw error;
    }
  }

  /**
   * Resolves canonical symbols to provider-specific symbols.
   * If no mapping exists for a symbol, it falls back to the canonical symbol.
   */
  async getProviderSymbols(symbols: string[], provider: string): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    if (symbols.length === 0) {
      return mapping;
    }

    const placeholders = symbols.map(() => "?").join(",");
    const query = `
      SELECT
        l.symbol_code AS canonical_symbol,
        MIN(COALESCE(lps.provider_symbol, l.symbol_code)) AS provider_symbol
      FROM listing l
      LEFT JOIN listing_provider_symbol lps
        ON lps.listing_id = l.listing_id
       AND lps.provider = ?
      WHERE l.symbol_code IN (${placeholders})
      GROUP BY l.symbol_code
    `;

    try {
      const statement = db.prepare(query);
      const results = statement.all(provider, ...symbols) as {
        canonical_symbol: string;
        provider_symbol: string;
      }[];

      for (const row of results) {
        mapping.set(row.canonical_symbol, row.provider_symbol);
      }

      return mapping;
    } catch (error) {
      console.error("Error resolving provider symbols:", error);
      throw error;
    }
  }

  /**
   * Resolves provider-specific symbols back to canonical symbols.
   * If no mapping exists, it falls back to identity (provider_symbol === symbol_code).
   */
  async getCanonicalSymbols(
    providerSymbols: string[],
    provider: string
  ): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    if (providerSymbols.length === 0) {
      return mapping;
    }

    const placeholders = providerSymbols.map(() => "?").join(",");
    const query = `
      SELECT
        MIN(l.symbol_code) AS canonical_symbol,
        COALESCE(lps.provider_symbol, l.symbol_code) AS provider_symbol
      FROM listing l
      LEFT JOIN listing_provider_symbol lps
        ON lps.listing_id = l.listing_id
       AND lps.provider = ?
      WHERE COALESCE(lps.provider_symbol, l.symbol_code) IN (${placeholders})
      GROUP BY COALESCE(lps.provider_symbol, l.symbol_code)
    `;

    try {
      const statement = db.prepare(query);
      const results = statement.all(provider, ...providerSymbols) as {
        canonical_symbol: string;
        provider_symbol: string;
      }[];

      for (const row of results) {
        mapping.set(row.provider_symbol, row.canonical_symbol);
      }

      return mapping;
    } catch (error) {
      console.error("Error resolving canonical symbols:", error);
      throw error;
    }
  }

  /**
   * Finds listings based on provided filters.
   */
  async findAll(options: {
    filters: {
      symbol_code?: string[];
      instrument_name?: string;
      instrument_type?: string[];
      isin?: string[];
      profile?: string[];
      risk_level?: string[];
      asset_class_level?: string[];
      market_cap?: string[];
      sector?: string[];
      sub_industry?: string[];
      country_exposure?: string[];
      country_code?: string[];
      currency_code?: string[];
    };
    limit?: number;
    offset?: number;
  }): Promise<Listing[]> {
    const { filters, limit = 50, offset = 0 } = options;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Helper to add multiselect filter
    const addFilter = (field: string, values?: string[]) => {
      if (values && values.length > 0) {
        const placeholders = values.map(() => "?").join(",");
        conditions.push(`LOWER(${field}) IN (${placeholders})`);
        params.push(...values.map((v) => v.toLowerCase()));
      }
    };

    addFilter("symbol_code", filters.symbol_code);
    addFilter("instrument_type", filters.instrument_type);
    addFilter("isin", filters.isin);
    addFilter("profile", filters.profile);
    addFilter("risk_level", filters.risk_level);
    addFilter("asset_class_level", filters.asset_class_level);
    addFilter("market_cap", filters.market_cap);
    addFilter("sector", filters.sector);
    addFilter("sub_industry", filters.sub_industry);
    addFilter("country_exposure", filters.country_exposure);
    addFilter("country_code", filters.country_code);
    addFilter("currency_code", filters.currency_code);

    // Partial match for instrument_name
    if (filters.instrument_name) {
      conditions.push("LOWER(instrument_name) LIKE ?");
      params.push(`%${filters.instrument_name.toLowerCase()}%`);
    }

    let query = "SELECT * FROM view_listings";

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    try {
      const statement = db.prepare(query);
      return statement.all(...params) as Listing[];
    } catch (error) {
      console.error("Error finding listings:", error);
      throw error;
    }
  }
}
