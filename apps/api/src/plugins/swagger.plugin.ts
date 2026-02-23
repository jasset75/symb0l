import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

/**
 * Swagger Plugin
 *
 * Configures OpenAPI documentation for the API.
 * Requires the version-resolver plugin to be loaded first to access the current stable API version.
 */
export default fp(
  async (fastify: FastifyInstance) => {
    // @ts-ignore
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: "Symb0l API",
          description: "API for Symb0l",
          version: fastify.versionConfig.stable,
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
  },
  {
    name: "swagger-plugin",
    fastify: "5.x",
    dependencies: ["version-resolver"], // Delay execution until version-resolver is ready
  },
);
