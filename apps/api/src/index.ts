import dotenv from "dotenv";
dotenv.config();

import { readFileSync } from "fs";
import { join } from "path";

import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { quoteRoutes } from "./routes/quotes.js";
import { ErrorSchema, QuoteSchema } from "./schemas/common.js";
import quoteServicePlugin from "./plugins/quote-service-plugin.js";

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
);
const version = packageJson.version;

const fastify = Fastify({
  logger: true,
});

// Register shared schemas
fastify.addSchema(ErrorSchema);
fastify.addSchema(QuoteSchema);

await fastify.register(cors, {
  origin: true, // Allow all origins for now
});

// Register Swagger
// @ts-ignore
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Symb0l API",
      description: "API for Symb0l",
      version: version,
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

// Register routes
await fastify.register(quoteRoutes, { prefix: `/v${version}/quotes` });

fastify.get("/", async (request, reply) => {
  return { hello: "world", service: "Symb0l API", version: version };
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
