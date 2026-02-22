import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Container } from "../infrastructure/di/container.js";

/**
 * Dependency Injection Plugin
 *
 * Replaces the scattered instantiation of services across multiple plugins.
 * Exposes the services initialized by the Container securely into the Fastify instance.
 */
export default fp(
  async (fastify: FastifyInstance) => {
    // Initialize the container (instantiates all dependencies in correct order)
    const container = Container.getInstance();

    // Decorate fastify with the central services
    fastify.decorate("listingRepository", container.listingRepository);
    fastify.decorate("quoteService", container.quoteService);
    fastify.decorate("listingService", container.listingService);
  },
  {
    name: "di-plugin",
    fastify: "5.x",
  },
);
