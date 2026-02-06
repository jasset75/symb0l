import {
  MarketDataProvider,
  Quote,
} from "../interfaces/market-data-provider.js";

export class QuoteService {
  constructor(private provider: MarketDataProvider) {}

  async getQuote(symbol: string): Promise<Quote | null> {
    // Domain logic could go here (e.g. caching, fallback, normalization)
    return this.provider.getQuote(symbol);
  }
}
