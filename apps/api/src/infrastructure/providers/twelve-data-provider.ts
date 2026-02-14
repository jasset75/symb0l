import {
  MarketDataProvider,
  Quote,
} from "../../domain/interfaces/market-data-provider.js";

export class TwelveDataProvider implements MarketDataProvider {
  private baseUrl = "https://api.twelvedata.com";

  constructor(private apiKey: string) {}

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      if (!this.apiKey) {
        throw new Error("API Key is missing");
      }

      const url = `${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`;
      // @ts-ignore
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code && data.code !== 200) {
        throw new Error(`Twelve Data API error: ${data.message}`);
      }

      if (!data.symbol) return null;

      return {
        symbol: data.symbol,
        price: parseFloat(data.close),
        currency: data.currency,
        timestamp: new Date(data.timestamp * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error fetching quote from TwelveData:", error);
      throw error;
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    if (symbols.length === 1) {
      const quote = await this.getQuote(symbols[0]);
      return quote ? [quote] : [];
    }

    try {
      if (!this.apiKey) {
        throw new Error("API Key is missing");
      }

      const symbolsStr = symbols.join(",");
      const url = `${this.baseUrl}/quote?symbol=${symbolsStr}&apikey=${this.apiKey}`;
      // @ts-ignore
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Batch response is an object where keys are symbols, OR it might be an error at top level
      if (data.code && data.code !== 200) {
        throw new Error(`Twelve Data API error: ${data.message}`);
      }

      const quotes: Quote[] = [];

      for (const key of Object.keys(data)) {
        const item = data[key];
        // Check if individual item has error or valid data
        if (item.symbol && item.close) {
          quotes.push({
            symbol: item.symbol,
            price: parseFloat(item.close),
            currency: item.currency,
            timestamp: new Date(item.timestamp * 1000).toISOString(),
          });
        }
      }

      return quotes;
    } catch (error) {
      console.error("Error fetching quotes from TwelveData:", error);
      throw error;
    }
  }
}
