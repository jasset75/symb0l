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
        let quotesMap = new Map();
        let error: any = null;

        try {
          const quotes = await this.quoteService.getQuotes(Array.from(symbols));
          quotes.forEach((q) => {
            quotesMap.set(q.symbol, q);
          });
        } catch (err) {
          console.error("Failed to fetch quotes for listings:", err);
          error = err;
        }

        // Attach quotes to listings
        return listings.map((l: { symbol_code: string }) => {
          const symbol = l.symbol_code;

          if (error) {
            return {
              ...l,
              quote: {
                status: "error",
                error: {
                  code: "provider_error",
                  message: error.message || "Failed to fetch quote",
                },
              },
            };
          }

          const quote = quotesMap.get(symbol);
          if (quote) {
            return {
              ...l,
              quote: {
                status: "success",
                data: quote,
              },
            };
          }

          return {
            ...l,
            quote: {
              status: "not_found",
            },
          };
        });
      }
    }

    return listings;
  }
}
