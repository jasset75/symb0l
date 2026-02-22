import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";

/**
 * Setup Plugin
 *
 * Configures the Fastify server with sensible defaults and CORS settings.
 */
export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(sensible);

    await fastify.register(cors, {
      origin: true, // Allow all origins for now
    });
  },
  {
    name: "setup-plugin",
    fastify: "5.x",
  },
);
