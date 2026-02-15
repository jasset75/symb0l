import {
  MarketDataProvider,
  Quote,
} from "../../domain/interfaces/market-data-provider.js";

export class MockDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote | null> {
    return {
      symbol: symbol,
      price: 123.45,
      currency: "USD",
      timestamp: new Date().toISOString(),
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((symbol) => ({
      symbol: symbol,
      price: 123.45,
      currency: "USD",
      timestamp: new Date().toISOString(),
    }));
  }
}
