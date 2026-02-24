import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { registerVersionedRoutes } from "./versioned-routes.plugin.js";
import { healthRoutes } from "../modules/health/index.js";
import { quoteRoutes } from "../modules/quotes/index.js";
import { listingsRoutes } from "../modules/listings/listings.routes.js";

/**
 * Routes Auto-loader Plugin
 *
 * Invokes the custom versioned routes register for all module routes.
 * Relies on DI and version-resolver plugins to be initialized first.
 */
export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(registerVersionedRoutes, {
      basePath: "/quotes",
      routePlugin: quoteRoutes,
    });

    await fastify.register(registerVersionedRoutes, {
      basePath: "/listings",
      routePlugin: listingsRoutes,
      minVersion: "0.2.0",
    });

    await fastify.register(registerVersionedRoutes, {
      basePath: "/health",
      routePlugin: healthRoutes,
      // No explicit versionOptions or minVersion provided,
      // automatically registers for all supported versions starting from '0.1.0'
    });

    // Default route redirects to health
    fastify.get("/", async (request, reply) => {
      return reply.redirect("/health");
    });
  },
  {
    name: "routes-plugin",
    fastify: "5.x",
    dependencies: ["version-resolver", "di-plugin", "swagger-plugin"], // Requires DI, Versioning, and Swagger (so onRoute hook is registered before routes)
  },
);
