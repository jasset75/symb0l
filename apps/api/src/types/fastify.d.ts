import { VersionConfig } from "../config/versions.config.js";
import { ListingRepository } from "@symb0l/core";
import { QuoteService } from "../domain/services/quote-service.js";
import { ListingService } from "../domain/services/listing-service.js";

declare module "fastify" {
  interface FastifyInstance {
    versionConfig: VersionConfig;
    getVersionPrefixes: () => string[];
    listingRepository: ListingRepository;
    quoteService: QuoteService;
    listingService: ListingService;
  }
}
