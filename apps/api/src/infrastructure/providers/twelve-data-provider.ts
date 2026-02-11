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
        // Log locally if needed, but return null or throw depending on contract
        // If simply not found, maybe null?
        // But 400 from twelvedata usually means bad request.
        // Let's stick to throwing for errors, and null for empty result if structure differs.
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
}
