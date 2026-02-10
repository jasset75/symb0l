import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { HealthV1RouteSchema, HealthV2RouteSchema } from "./health.schema.js";
import { handleHealthV1, handleHealthV2 } from "./health.handler.js";

interface HealthRoutesOptions extends FastifyPluginOptions {
  version?: string; // e.g., "0.1.0" or "0.2.0"
}

const VERSION_CONFIG = {
  "0.1.0": {
    routeSchema: HealthV1RouteSchema,
    handler: handleHealthV1,
  },
  "0.2.0": {
    routeSchema: HealthV2RouteSchema,
    handler: handleHealthV2,
  },
} as const;

const DEFAULT_VERSION = "0.2.0";

/**
 * Health check routes plugin
 * Supports version-specific response formats
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  opts: HealthRoutesOptions & { hideFromSwagger?: boolean },
) {
  const { version = DEFAULT_VERSION, hideFromSwagger } = opts;
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  const config =
    VERSION_CONFIG[version as keyof typeof VERSION_CONFIG] ??
    VERSION_CONFIG[DEFAULT_VERSION];

  server.get(
    "/",
    {
      schema: {
        ...config.routeSchema,
        hide: hideFromSwagger,
      },
    },
    config.handler,
  );
}
