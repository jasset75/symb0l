/**
 * Exchange Master Data
 *
 * This seed data provides the foundational exchange reference data
 * based on the exchanges used in symbol_source.txt
 */

export interface ExchangeData {
  code: string;
  name: string;
}

export const exchanges: ExchangeData[] = [
  {
    code: "NASDAQ",
    name: "NASDAQ Stock Market",
  },
  {
    code: "NYSE",
    name: "New York Stock Exchange",
  },
  {
    code: "BME",
    name: "Bolsa de Madrid",
  },
  {
    code: "EPA",
    name: "Euronext Paris",
  },
  {
    code: "FRA",
    name: "Frankfurt Stock Exchange",
  },
  {
    code: "AMS",
    name: "Euronext Amsterdam",
  },
  {
    code: "BIT",
    name: "Borsa Italiana",
  },
  {
    code: "LON",
    name: "London Stock Exchange",
  },
  {
    code: "VIE",
    name: "Vienna Stock Exchange",
  },
  {
    code: "SWX",
    name: "SIX Swiss Exchange",
  },
  {
    code: "FOREX",
    name: "Foreign Exchange Market",
  },
];
