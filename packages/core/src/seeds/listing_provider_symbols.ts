/**
 * Listing Provider Symbol Master Data
 *
 * Maps internal canonical listing symbols to provider-specific symbols.
 * Keep only non-redundant mappings where provider_symbol differs from symbol_code.
 */

export interface ListingProviderSymbolData {
  market_prefix: string; // Used to resolve listing_id through market + symbol_code
  symbol_code: string; // Canonical internal symbol
  provider: string; // External provider key (e.g. "twelve")
  provider_symbol: string; // Provider-specific symbol (e.g. "EUR/USD")
}

export const listingProviderSymbols: ListingProviderSymbolData[] = [
  {
    market_prefix: "CURRENCY",
    symbol_code: "EURUSD",
    provider: "twelve",
    provider_symbol: "EUR/USD",
  },
  {
    market_prefix: "CURRENCY",
    symbol_code: "USDEUR",
    provider: "twelve",
    provider_symbol: "USD/EUR",
  },
];
