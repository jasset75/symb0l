import { ListingRepository } from "@symb0l/core";
import { QuoteService } from "./quote-service.js";
import { FastifyBaseLogger } from "fastify";

export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly quoteService: QuoteService,
    private readonly log?: FastifyBaseLogger,
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
      const listingsWithIds = listings
        .map((listing) => ({
          listing_id: Number((listing as { listing_id?: number }).listing_id),
          symbol_code: String((listing as { symbol_code: string }).symbol_code),
        }))
        .filter((listing) => Number.isFinite(listing.listing_id));

      if (listingsWithIds.length > 0) {
        let quotesMap = new Map();
        let error: any = null;

        try {
          quotesMap =
            await this.quoteService.getQuotesForListings(listingsWithIds);
        } catch (err) {
          if (this.log) {
            this.log.error({ err }, "Failed to fetch quotes for listings");
          } else {
            console.error("Failed to fetch quotes for listings:", err);
          }
          error = err;
        }

        // Attach quotes to listings
        return listings.map((listing) => {
          const listingId = Number(
            (listing as { listing_id?: number }).listing_id,
          );
          const metadataCurrency = String(
            (listing as { currency_code?: string }).currency_code ?? "",
          ).toUpperCase();
          const instrumentType = String(
            (listing as { instrument_type?: string }).instrument_type ?? "",
          );
          const isCurrencyPair = instrumentType === "Currency Pair";

          if (error) {
            return {
              ...listing,
              quote: {
                status: "error",
                error: {
                  code: "provider_error",
                  message: error.message || "Failed to fetch quote",
                },
              },
            };
          }

          const quote = quotesMap.get(listingId);
          if (quote) {
            const providerCurrency = String(
              (quote as { currency?: string }).currency ?? "",
            ).toUpperCase();

            if (
              metadataCurrency &&
              providerCurrency &&
              metadataCurrency !== providerCurrency
            ) {
              if (isCurrencyPair) {
                if (this.log) {
                  this.log.warn(
                    `Currency mismatch ignored for FX pair ${String(
                      (listing as { symbol_code?: string }).symbol_code ?? "",
                    )}: metadata=${metadataCurrency}, provider=${providerCurrency}`,
                  );
                } else {
                  console.warn(
                    `Currency mismatch ignored for FX pair ${String(
                      (listing as { symbol_code?: string }).symbol_code ?? "",
                    )}: metadata=${metadataCurrency}, provider=${providerCurrency}`,
                  );
                }
              } else {
                return {
                  ...listing,
                  quote: {
                    status: "error",
                    error: {
                      code: "currency_mismatch",
                      message: `Currency mismatch for ${String(
                        (listing as { symbol_code?: string }).symbol_code ?? "",
                      )}: metadata=${metadataCurrency}, provider=${providerCurrency}`,
                    },
                  },
                };
              }
            }

            return {
              ...listing,
              quote: {
                status: "success",
                data: {
                  ...quote,
                  currency: metadataCurrency || quote.currency,
                },
              },
            };
          }

          return {
            ...listing,
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
