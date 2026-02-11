import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { TwelveDataProvider } from "../infrastructure/providers/twelve-data-provider.js";
import { QuoteService } from "../domain/services/quote-service.js";

declare module "fastify" {
  interface FastifyInstance {
    quoteService: QuoteService;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const apiKey = process.env.TWELVE_DATA_API_KEY || "";

  // Composition Root
  const provider = new TwelveDataProvider(apiKey);
  const service = new QuoteService(provider);

  fastify.decorate("quoteService", service);
});
