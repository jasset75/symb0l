import {
  MarketDataProvider,
  Quote,
} from "../interfaces/market-data-provider.js";

import { ListingRepository } from "@symb0l/core";

export class QuoteService {
  constructor(
    private provider: MarketDataProvider,
    private listingRepo: ListingRepository,
    private providerName: string = "default",
  ) {}

  async getQuote(symbol: string): Promise<Quote | null> {
    const validSymbols = await this.listingRepo.validateSymbols([symbol]);
    if (validSymbols.length === 0) {
      // Symbol not found in DB
      return null;
    }

    const providerSymbolMap = await this.listingRepo.getProviderSymbols(
      validSymbols,
      this.providerName,
    );
    const providerSymbol = providerSymbolMap.get(symbol) ?? symbol;

    const quote = await this.provider.getQuote(providerSymbol);
    if (!quote) {
      return null;
    }

    return {
      ...quote,
      symbol,
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const validSymbols = await this.listingRepo.validateSymbols(symbols);
    const missing = symbols.filter((s) => !validSymbols.includes(s));

    if (missing.length > 0) {
      throw new Error(`Symbols not found: ${missing.join(", ")}`);
    }

    const providerSymbolMap = await this.listingRepo.getProviderSymbols(
      validSymbols,
      this.providerName,
    );

    const providerSymbols = validSymbols.map(
      (canonicalSymbol) => providerSymbolMap.get(canonicalSymbol) ?? canonicalSymbol,
    );
    const providerQuotes = await this.provider.getQuotes(providerSymbols);

    // Reverse mapping for response normalization
    const reverseMap = new Map<string, string>();
    for (const canonicalSymbol of validSymbols) {
      const providerSymbol = providerSymbolMap.get(canonicalSymbol) ?? canonicalSymbol;
      if (!reverseMap.has(providerSymbol)) {
        reverseMap.set(providerSymbol, canonicalSymbol);
      }
    }

    // Fallback reverse mapping using repository in case provider response format differs
    const unresolvedProviderSymbols = providerQuotes
      .map((quote) => quote.symbol)
      .filter((providerSymbol) => !reverseMap.has(providerSymbol));

    if (unresolvedProviderSymbols.length > 0) {
      const canonicalMap = await this.listingRepo.getCanonicalSymbols(
        unresolvedProviderSymbols,
        this.providerName,
      );
      for (const [providerSymbol, canonicalSymbol] of canonicalMap) {
        reverseMap.set(providerSymbol, canonicalSymbol);
      }
    }

    return providerQuotes.map((quote) => ({
      ...quote,
      symbol: reverseMap.get(quote.symbol) ?? quote.symbol,
    }));
  }
}
