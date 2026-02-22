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

/**
 * Health check routes plugin
 * Supports version-specific response formats
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  opts: HealthRoutesOptions & { hideFromSwagger?: boolean },
) {
  const defaultVersion = fastify.versionConfig.stableVersion.full;
  const { version = defaultVersion, hideFromSwagger } = opts;
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  const versionKey =
    version in VERSION_CONFIG
      ? (version as keyof typeof VERSION_CONFIG)
      : (defaultVersion as keyof typeof VERSION_CONFIG);

  const config = VERSION_CONFIG[versionKey];

  if (versionKey === "0.1.0") {
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
  } else if (versionKey === "0.2.0") {
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
  } else {
    // This provides exhaustive type checking (or runtime fast-fail)
    // if a new version is added to VERSION_CONFIG but not handled here.
    throw new Error(`Unhandled health route version: ${versionKey}`);
  }
}
