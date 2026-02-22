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

  async getQuotesForListings(
    listings: Array<{ listing_id: number; symbol_code: string }>,
  ): Promise<Map<number, Quote>> {
    const quotesByListingId = new Map<number, Quote>();
    if (listings.length === 0) {
      return quotesByListingId;
    }

    const listingIds = listings.map((listing) => listing.listing_id);
    const listingSymbolMap = await this.listingRepo.getProviderSymbolsByListingIds(
      listingIds,
      this.providerName,
    );

    const providerSymbolToListing = new Map<string, number>();
    const providerSymbols: string[] = [];

    for (const listing of listings) {
      const resolved = listingSymbolMap.get(listing.listing_id);
      const providerSymbol = resolved?.providerSymbol ?? listing.symbol_code;
      if (!providerSymbolToListing.has(providerSymbol)) {
        providerSymbolToListing.set(providerSymbol, listing.listing_id);
        providerSymbols.push(providerSymbol);
      }
    }

    const providerQuotes = await this.provider.getQuotes(providerSymbols);

    for (const quote of providerQuotes) {
      const listingId = providerSymbolToListing.get(quote.symbol);
      if (!listingId) {
        continue;
      }

      const resolved = listingSymbolMap.get(listingId);
      quotesByListingId.set(listingId, {
        ...quote,
        symbol: resolved?.canonicalSymbol ?? quote.symbol,
      });
    }

    return quotesByListingId;
  }
}
