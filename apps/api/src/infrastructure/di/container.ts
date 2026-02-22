import { ListingRepository } from "@symb0l/core";
import { TwelveDataProvider } from "../providers/twelve-data-provider.js";
import { QuoteService } from "../../domain/services/quote-service.js";
import { ListingService } from "../../domain/services/listing-service.js";

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

  private constructor() {
    // 1. Repositories
    this.listingRepository = new ListingRepository();

    // 2. Providers
    const apiKey = process.env.TWELVE_DATA_API_KEY || "";
    const twelveDataProvider = new TwelveDataProvider(apiKey);

    // 3. Domain Services
    this.quoteService = new QuoteService(
      twelveDataProvider,
      this.listingRepository,
      "twelve",
    );
    this.listingService = new ListingService(
      this.listingRepository,
      this.quoteService,
    );
  }

  /**
   * Retrieves the singleton instance of the Container
   */
  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
