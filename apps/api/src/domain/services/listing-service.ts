import { ListingRepository } from "@symb0l/core";
import { QuoteService } from "./quote-service.js";

export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly quoteService: QuoteService,
  ) {}

  async getListings(
    options: {
      filters: any;
      limit: number;
      offset: number;
    },
    includeQuote: boolean,
  ): Promise<any[]> {
    const listings = await this.listingRepository.findAll({
      filters: options.filters,
      limit: options.limit,
      offset: options.offset,
    });

    if (includeQuote && listings.length > 0) {
      // Extract unique symbols from listings
      const symbols = new Set<string>();
      listings.forEach((l: { symbol_code: string }) => {
        if (l.symbol_code) {
          symbols.add(l.symbol_code);
        }
      });

      if (symbols.size > 0) {
        try {
          // Fetch quotes for these symbols is batch
          // Note: getQuotes might not return quotes for all symbols if they fail
          const quotes = await this.quoteService.getQuotes(Array.from(symbols));

          // Index quotes by symbol for O(1) lookup
          const quotesMap = new Map();
          quotes.forEach((q) => {
            quotesMap.set(q.symbol, q);
          });

          // Attach quotes to listings
          return listings.map((l: { symbol_code: string }) => ({
            ...l,
            quote: quotesMap.get(l.symbol_code),
          }));
        } catch (error) {
          // If quote fetching fails, just return listings without quotes (graceful degradation)
          // Or we could throw, but for a "listing" endpoint, partial data is usually better.
          // However, user requirement implied "includeQuote" functionality.
          // Logging error is good practice.
          console.error("Failed to fetch quotes for listings:", error);
          // Return listings as is
          return listings;
        }
      }
    }

    return listings;
  }
}
