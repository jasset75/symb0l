import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { quoteRoutes } from "./routes/quotes.js";
import { ErrorSchema, QuoteSchema } from "./schemas/common.js";
import quoteServicePlugin from "./plugins/quote-service-plugin.js";
import versionResolverPlugin from "./plugins/version-resolver.plugin.js";
import versionHeadersPlugin from "./plugins/version-headers.plugin.js";

import { healthRoutes } from "./routes/health.js";
import { registerVersionedRoutes } from "./plugins/versioned-routes.plugin.js";

const fastify = Fastify({
  logger: true,
});

// Register shared schemas
fastify.addSchema(ErrorSchema);
fastify.addSchema(QuoteSchema);

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

await fastify.register(quoteServicePlugin);

// Register versioned routes using helper plugin
// Automatically registers all versions (canonical + aliases + default)
// Only canonical (stable) version is documented in Swagger
await fastify.register(registerVersionedRoutes, {
  basePath: "/quotes",
  routePlugin: quoteRoutes,
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

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
