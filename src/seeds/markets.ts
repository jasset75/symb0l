/**
 * Market Master Data
 *
 * Markets are specific trading venues operated by exchanges.
 * Multiple markets can belong to the same exchange organization.
 *
 * Examples:
 * - Euronext operates: Paris (EPA), Amsterdam (AMS), Milan (BIT)
 * - Each market has a unique code used in symbol identifiers
 */

export interface MarketData {
  exchange_code: string;
  code: string;
  name: string;
}

export const markets: MarketData[] = [
  // Euronext Markets (Pan-European)
  {
    exchange_code: "EURONEXT",
    code: "EPA",
    name: "Euronext Paris",
  },
  {
    exchange_code: "EURONEXT",
    code: "AMS",
    name: "Euronext Amsterdam",
  },
  {
    exchange_code: "EURONEXT",
    code: "BIT",
    name: "Borsa Italiana (Milan)",
  },

  // US Markets
  {
    exchange_code: "NYSE_GROUP",
    code: "NYSE",
    name: "NYSE Main Market",
  },
  {
    exchange_code: "NASDAQ",
    code: "NASDAQ",
    name: "NASDAQ Global Market",
  },

  // European National Markets
  {
    exchange_code: "BME",
    code: "BME",
    name: "BME Madrid",
  },
  {
    exchange_code: "DEUTSCHE_BOERSE",
    code: "FRA",
    name: "Xetra Frankfurt",
  },
  {
    exchange_code: "LSEG",
    code: "LON",
    name: "London Stock Exchange",
  },
  {
    exchange_code: "WIENER_BOERSE",
    code: "VIE",
    name: "Vienna Stock Exchange",
  },
  {
    exchange_code: "SIX_GROUP",
    code: "SWX",
    name: "SIX Swiss Exchange",
  },

  // Foreign Exchange
  {
    exchange_code: "FOREX",
    code: "FOREX",
    name: "Foreign Exchange Market",
  },
];
