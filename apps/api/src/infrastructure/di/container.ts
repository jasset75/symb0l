import { ListingRepository } from "@symb0l/core";
import { TwelveDataProvider } from "../providers/twelve-data-provider.js";
import { QuoteService } from "../../domain/services/quote-service.js";
import { ListingService } from "../../domain/services/listing-service.js";
import { FastifyBaseLogger } from "fastify";

/**
 * Lightweight Dependency Injection Container
 *
 * Centralizes the instantiation of application services and repositories.
 * This decoupled approach ensures Fastify plugins don't manage singletons
 * manually and guarantees correct initialization order.
 */
export class Container {
  private static instance: Container;

  public readonly listingRepository: ListingRepository;
  public readonly quoteService: QuoteService;
  public readonly listingService: ListingService;

  private constructor(logger?: FastifyBaseLogger) {
    // 1. Repositories
    this.listingRepository = new ListingRepository();

    // 2. Providers
    const apiKey = process.env.TWELVE_DATA_API_KEY || "";
    const batchSizeStr = process.env.TWELVE_DATA_BATCH_SIZE;
    const parsedBatchSize = batchSizeStr ? parseInt(batchSizeStr, 10) : 8;
    const batchSize = Number.isNaN(parsedBatchSize) || parsedBatchSize <= 0 ? 8 : parsedBatchSize;
    const twelveDataProvider = new TwelveDataProvider(apiKey, logger, batchSize);

    // 3. Domain Services
    this.quoteService = new QuoteService(
      twelveDataProvider,
      this.listingRepository,
      "twelve",
    );
    this.listingService = new ListingService(
      this.listingRepository,
      this.quoteService,
      logger,
    );
  }

  /**
   * Retrieves the singleton instance of the Container
   */
  public static getInstance(logger?: FastifyBaseLogger): Container {
    if (!Container.instance) {
      Container.instance = new Container(logger);
    }
    return Container.instance;
  }
}
