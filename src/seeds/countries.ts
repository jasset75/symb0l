/**
 * Country Master Data (ISO 3166-1 alpha-2)
 *
 * Countries using ISO 3166-1 alpha-2 standard codes.
 * This table supports markets and can be extended with additional
 * country metadata in the future (region, default currency, etc.).
 *
 * Data source: ISO 3166-1 alpha-2 standard
 * https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
 */

export interface CountryData {
  country_code: string; // ISO 3166-1 alpha-2
  name: string;
}

export const countries: CountryData[] = [
  // North America
  { country_code: "US", name: "United States" },
  { country_code: "CA", name: "Canada" },

  // Europe
  { country_code: "FR", name: "France" },
  { country_code: "NL", name: "Netherlands" },
  { country_code: "IT", name: "Italy" },
  { country_code: "BE", name: "Belgium" },
  { country_code: "PT", name: "Portugal" },
  { country_code: "IE", name: "Ireland" },
  { country_code: "ES", name: "Spain" },
  { country_code: "DE", name: "Germany" },
  { country_code: "GB", name: "United Kingdom" },
  { country_code: "CH", name: "Switzerland" },
  { country_code: "AT", name: "Austria" },
  { country_code: "SE", name: "Sweden" },
  { country_code: "NO", name: "Norway" },

  // Asia-Pacific
  { country_code: "JP", name: "Japan" },
  { country_code: "HK", name: "Hong Kong" },
  { country_code: "CN", name: "China" },
  { country_code: "AU", name: "Australia" },
  { country_code: "SG", name: "Singapore" },
  { country_code: "KR", name: "South Korea" },
  { country_code: "TW", name: "Taiwan" },
  { country_code: "IN", name: "India" },
];
