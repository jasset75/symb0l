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

// Register Swagger
// @ts-ignore
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Symb0l API",
      description: "API for Symb0l",
      version: fastify.versionConfig.current.full,
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

// Register routes with version patterns
// Only the canonical (exact version) route appears in Swagger documentation
// Alias routes (major version and default) work but are not documented
const versionPrefixes = fastify.getVersionPrefixes();
const exactVersion = versionPrefixes[0]; // e.g., 'v0.1.0'

// 1. Register canonical route WITH Swagger documentation
await fastify.register(quoteRoutes, { prefix: `/${exactVersion}/quotes` });
fastify.log.info(
  `Registered quotes routes at: /${exactVersion}/quotes (documented in Swagger)`,
);

// 2. Register alias routes WITHOUT Swagger documentation
// These routes work but don't appear in Swagger UI
for (let i = 1; i < versionPrefixes.length; i++) {
  const versionPrefix = versionPrefixes[i];
  const prefix = versionPrefix ? `/${versionPrefix}/quotes` : "/quotes";

  // Register with hideFromSwagger option
  await fastify.register(quoteRoutes, { prefix, hideFromSwagger: true });

  fastify.log.info(
    `Registered quotes routes at: ${prefix} (alias, hidden from Swagger)`,
  );
}

fastify.get("/", async (request, reply) => {
  return {
    hello: "world",
    service: "Symb0l API",
    version: fastify.versionConfig.current.full,
    availableVersions: fastify.getVersionPrefixes().filter((v) => v !== ""),
  };
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
