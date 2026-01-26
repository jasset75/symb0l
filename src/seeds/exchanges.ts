/**
 * Exchange Master Data
 *
 * Exchanges are organizations that operate one or more trading markets.
 * This represents the top level of the financial market hierarchy.
 *
 * Examples:
 * - Euronext operates markets in Paris (EPA), Amsterdam (AMS), Milan (BIT), etc.
 * - NYSE Group operates NYSE Main, NYSE Arca, NYSE American, etc.
 */

export interface ExchangeData {
  code: string;
  name: string;
}

export const exchanges: ExchangeData[] = [
  // Pan-European Exchange
  {
    code: "EURONEXT",
    name: "Euronext N.V.",
  },

  // US Exchanges
  {
    code: "NYSE_GROUP",
    name: "NYSE Group (ICE)",
  },
  {
    code: "NASDAQ",
    name: "NASDAQ Inc.",
  },

  // European National Exchanges
  {
    code: "BME",
    name: "Bolsas y Mercados Españoles",
  },
  {
    code: "DEUTSCHE_BOERSE",
    name: "Deutsche Börse AG",
  },
  {
    code: "LSEG",
    name: "London Stock Exchange Group",
  },
  {
    code: "WIENER_BOERSE",
    name: "Wiener Börse AG",
  },
  {
    code: "SIX_GROUP",
    name: "SIX Group",
  },

  // Foreign Exchange
  {
    code: "FOREX",
    name: "Foreign Exchange Market",
  },
];
