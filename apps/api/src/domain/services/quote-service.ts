import {
  MarketDataProvider,
  Quote,
} from "../interfaces/market-data-provider.js";

import { ListingRepository } from "@symb0l/core";

export class QuoteService {
  constructor(
    private provider: MarketDataProvider,
    private listingRepo: ListingRepository,
  ) {}

  async getQuote(symbol: string): Promise<Quote | null> {
    const validSymbols = await this.listingRepo.validateSymbols([symbol]);
    if (validSymbols.length === 0) {
      // Symbol not found in DB
      return null;
    }
    return this.provider.getQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const validSymbols = await this.listingRepo.validateSymbols(symbols);
    const missing = symbols.filter((s) => !validSymbols.includes(s));

    if (missing.length > 0) {
      throw new Error(`Symbols not found: ${missing.join(", ")}`);
    }

    return this.provider.getQuotes(symbols);
  }
}
