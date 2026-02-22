import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { ListingService } from "../domain/services/listing-service.js";

export default fp(
  async (fastify: FastifyInstance) => {
    // Dependencies must be registered before this plugin
    const listingRepo = fastify.listingRepository;
    const quoteService = fastify.quoteService;

    if (!listingRepo || !quoteService) {
      throw new Error(
        "Dependencies not met. Ensure repository-plugin and quote-service-plugin are registered.",
      );
    }

    const service = new ListingService(listingRepo, quoteService);

    fastify.decorate("listingService", service);
  },
  {
    name: "listing-service-plugin",
    fastify: "5.x",
    dependencies: ["repository-plugin", "quote-service-plugin"],
  },
);
