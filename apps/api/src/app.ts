import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import sensible from "@fastify/sensible";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { ErrorSchema, QuoteSchema } from "./schemas/common.js";
import { ListingSchema } from "./modules/listings/listings.schema.js";
import quoteServicePlugin from "./plugins/quote-service-plugin.js";
import versionResolverPlugin from "./plugins/version-resolver.plugin.js";
import versionHeadersPlugin from "./plugins/version-headers.plugin.js";
import { registerVersionedRoutes } from "./plugins/versioned-routes.plugin.js";
import { healthRoutes } from "./modules/health/index.js";
import { quoteRoutes } from "./modules/quotes/index.js";
import { listingsRoutes } from "./modules/listings/listings.routes.js";
import listingServicePlugin from "./plugins/listing-service-plugin.js";
import repositoryPlugin from "./plugins/repository-plugin.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register shared schemas
  fastify.addSchema(ErrorSchema);
  fastify.addSchema(QuoteSchema);
  fastify.addSchema(ListingSchema);

  await fastify.register(sensible);

  await fastify.register(cors, {
    origin: true, // Allow all origins for now
  });

  // Register version resolver plugin first
  await fastify.register(versionResolverPlugin);

  // Register version headers plugin (depends on version resolver)
  await fastify.register(versionHeadersPlugin);

  // Register Swagger
  // @ts-ignore
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Symb0l API",
        description: "API for Symb0l",
        version: fastify.versionConfig.stableVersion.full,
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local server",
        },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/documentation",
  });

  // Register repository plugin first
  await fastify.register(repositoryPlugin);

  await fastify.register(quoteServicePlugin);
  await fastify.register(listingServicePlugin);

  // Register versioned routes using helper plugin
  // Automatically registers all versions (canonical + aliases + default)
  // Only canonical (stable) version is documented in Swagger
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
    basePath: "/health", // Now consistent with quotes pattern
    routePlugin: healthRoutes,
    versionOptions: {
      "0.1.0": { version: "0.1.0" },
      "0.2.0": { version: "0.2.0" },
    },
  });

  // Default route redirects to health
  fastify.get("/", async (request, reply) => {
    return reply.redirect("/health");
  });

  return fastify;
}
