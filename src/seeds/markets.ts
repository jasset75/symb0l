/**
 * Market Master Data (ISO 10383 MIC-based with ticker prefix support)
 *
 * Markets are trading venues identified by their Market Identifier Code (MIC)
 * as defined by ISO 10383 standard. Each market also has a ticker_prefix
 * used by platforms like Google Finance for symbol notation (e.g., NASDAQ:AAPL).
 *
 * Data source: Twelve Data API + Google Finance
 * https://api.twelvedata.com/exchanges
 */

export interface MarketData {
  mic_code: string;
  ticker_prefix: string;
  name: string;
  title: string;
  country_code: string;
  timezone: string;
}

export const markets: MarketData[] = [
  // Europe
  {
    mic_code: "XPAR",
    ticker_prefix: "EPA",
    name: "Euronext",
    title: "Euronext Paris",
    country_code: "FR",
    timezone: "Europe/Paris",
  },
  {
    mic_code: "XAMS",
    ticker_prefix: "AMS",
    name: "Euronext",
    title: "Euronext Amsterdam",
    country_code: "NL",
    timezone: "Europe/Amsterdam",
  },
  {
    mic_code: "XMIL",
    ticker_prefix: "BIT",
    name: "Euronext",
    title: "Euronext Milan",
    country_code: "IT",
    timezone: "Europe/Rome",
  },
  {
    mic_code: "XBRU",
    ticker_prefix: "EBR",
    name: "Euronext",
    title: "Euronext Brussels",
    country_code: "BE",
    timezone: "Europe/Brussels",
  },
  {
    mic_code: "XLIS",
    ticker_prefix: "ELI",
    name: "Euronext",
    title: "Euronext Lisbon",
    country_code: "PT",
    timezone: "Europe/Lisbon",
  },
  {
    mic_code: "XMSM",
    ticker_prefix: "ISE",
    name: "Euronext",
    title: "Euronext Dublin",
    country_code: "IE",
    timezone: "Europe/Dublin",
  },
  {
    mic_code: "XMAD",
    ticker_prefix: "BME",
    name: "BME",
    title: "Bolsa de Madrid",
    country_code: "ES",
    timezone: "Europe/Madrid",
  },
  {
    mic_code: "XETR",
    ticker_prefix: "ETR",
    name: "XETR",
    title: "Frankfurt Stock Exchange (Xetra)",
    country_code: "DE",
    timezone: "Europe/Berlin",
  },
  {
    mic_code: "XFRA",
    ticker_prefix: "FRA",
    name: "FSX",
    title: "Frankfurt Stock Exchange",
    country_code: "DE",
    timezone: "Europe/Berlin",
  },
  {
    mic_code: "XLON",
    ticker_prefix: "LON",
    name: "LSE",
    title: "London Stock Exchange",
    country_code: "GB",
    timezone: "Europe/London",
  },
  {
    mic_code: "XSWX",
    ticker_prefix: "SWX",
    name: "SIX",
    title: "SIX Swiss Exchange",
    country_code: "CH",
    timezone: "Europe/Zurich",
  },
  {
    mic_code: "XWBO",
    ticker_prefix: "VIE",
    name: "VSE",
    title: "Vienna Stock Exchange",
    country_code: "AT",
    timezone: "Europe/Vienna",
  },
  {
    mic_code: "XSTO",
    ticker_prefix: "STO",
    name: "OMX",
    title: "Nasdaq Stockholm",
    country_code: "SE",
    timezone: "Europe/Stockholm",
  },
  {
    mic_code: "XOSL",
    ticker_prefix: "OSL",
    name: "OSE",
    title: "Euronext Oslo",
    country_code: "NO",
    timezone: "Europe/Oslo",
  },

  // North America
  {
    mic_code: "XNYS",
    ticker_prefix: "NYSE",
    name: "NYSE",
    title: "New York Stock Exchange, Inc.",
    country_code: "US",
    timezone: "America/New_York",
  },
  {
    mic_code: "XNAS",
    ticker_prefix: "NASDAQ",
    name: "NASDAQ",
    title: "Nasdaq",
    country_code: "US",
    timezone: "America/New_York",
  },
  {
    mic_code: "XNGS",
    ticker_prefix: "NASDAQ",
    name: "NASDAQ",
    title: "Nasdaq/NGS (Global Select Market)",
    country_code: "US",
    timezone: "America/New_York",
  },
  {
    mic_code: "XNMS",
    ticker_prefix: "NASDAQ",
    name: "NASDAQ",
    title: "Nasdaq/NMS (Global Market)",
    country_code: "US",
    timezone: "America/New_York",
  },
  {
    mic_code: "ARCX",
    ticker_prefix: "NYSEARCA",
    name: "NYSE",
    title: "NYSE Arca",
    country_code: "US",
    timezone: "America/New_York",
  },
  {
    mic_code: "XTSE",
    ticker_prefix: "TSE",
    name: "TSX",
    title: "Toronto Stock Exchange",
    country_code: "CA",
    timezone: "America/Toronto",
  },

  // Asia-Pacific
  {
    mic_code: "XJPX",
    ticker_prefix: "TYO",
    name: "JPX",
    title: "Tokyo Stock Exchange",
    country_code: "JP",
    timezone: "Asia/Tokyo",
  },
  {
    mic_code: "XHKG",
    ticker_prefix: "HKG",
    name: "HKEX",
    title: "Hong Kong Stock Exchange",
    country_code: "HK",
    timezone: "Asia/Hong_Kong",
  },
  {
    mic_code: "XSHG",
    ticker_prefix: "SHA",
    name: "SSE",
    title: "Shanghai Stock Exchange",
    country_code: "CN",
    timezone: "Asia/Shanghai",
  },
  {
    mic_code: "XSHE",
    ticker_prefix: "SHE",
    name: "SZSE",
    title: "Shenzhen Stock Exchange",
    country_code: "CN",
    timezone: "Asia/Shanghai",
  },
  {
    mic_code: "XASX",
    ticker_prefix: "ASX",
    name: "ASX",
    title: "Australian Securities Exchange",
    country_code: "AU",
    timezone: "Australia/Sydney",
  },
  {
    mic_code: "XSES",
    ticker_prefix: "SGX",
    name: "SGX",
    title: "Singapore Exchange",
    country_code: "SG",
    timezone: "Asia/Singapore",
  },
  {
    mic_code: "XKRX",
    ticker_prefix: "KRX",
    name: "KRX",
    title: "Korea Stock Exchange",
    country_code: "KR",
    timezone: "Asia/Seoul",
  },
  {
    mic_code: "XTAI",
    ticker_prefix: "TPE",
    name: "TWSE",
    title: "Taiwan Stock Exchange",
    country_code: "TW",
    timezone: "Asia/Taipei",
  },
  {
    mic_code: "XNSE",
    ticker_prefix: "NSE",
    name: "NSE",
    title: "National Stock Exchange of India",
    country_code: "IN",
    timezone: "Asia/Kolkata",
  },
  {
    mic_code: "XBOM",
    ticker_prefix: "BOM",
    name: "BSE",
    title: "Bombay Stock Exchange",
    country_code: "IN",
    timezone: "Asia/Kolkata",
  },
  {
    mic_code: "XFX",
    ticker_prefix: "CURRENCY",
    name: "Forex",
    title: "Foreign Exchange",
    country_code: "US",
    timezone: "UTC",
  },
];
