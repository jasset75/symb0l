/**
 * G10 Currency Master Data
 *
 * The G10 currencies are the 10 most heavily traded currencies in the forex market.
 * This seed data provides the foundational currency reference data.
 */

export interface CurrencyData {
  currency_id: string;
  name: string;
  code3: string;
  code2: string;
  currency_symbol: string;
  decimal_digits: number;
}

export const currencies: CurrencyData[] = [
  {
    currency_id: "840",
    name: "United States Dollar",
    code3: "USD",
    code2: "US",
    currency_symbol: "$",
    decimal_digits: 2,
  },
  {
    currency_id: "978",
    name: "Euro",
    code3: "EUR",
    code2: "EU",
    currency_symbol: "€",
    decimal_digits: 2,
  },
  {
    currency_id: "392",
    name: "Japanese Yen",
    code3: "JPY",
    code2: "JP",
    currency_symbol: "¥",
    decimal_digits: 0,
  },
  {
    currency_id: "826",
    name: "British Pound Sterling",
    code3: "GBP",
    code2: "GB",
    currency_symbol: "£",
    decimal_digits: 2,
  },
  {
    currency_id: "036",
    name: "Australian Dollar",
    code3: "AUD",
    code2: "AU",
    currency_symbol: "A$",
    decimal_digits: 2,
  },
  {
    currency_id: "124",
    name: "Canadian Dollar",
    code3: "CAD",
    code2: "CA",
    currency_symbol: "C$",
    decimal_digits: 2,
  },
  {
    currency_id: "756",
    name: "Swiss Franc",
    code3: "CHF",
    code2: "CH",
    currency_symbol: "CHF",
    decimal_digits: 2,
  },
  {
    currency_id: "554",
    name: "New Zealand Dollar",
    code3: "NZD",
    code2: "NZ",
    currency_symbol: "NZ$",
    decimal_digits: 2,
  },
  {
    currency_id: "578",
    name: "Norwegian Krone",
    code3: "NOK",
    code2: "NO",
    currency_symbol: "kr",
    decimal_digits: 2,
  },
  {
    currency_id: "752",
    name: "Swedish Krona",
    code3: "SEK",
    code2: "SE",
    currency_symbol: "kr",
    decimal_digits: 2,
  },
];
