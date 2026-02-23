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
  const defaultVersion = fastify.versionConfig.stable;
  const { version = defaultVersion, hideFromSwagger } = opts;
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Prevent drift: if the API version (e.g. "0.3.0") has no specific health schema yet,
  // fallback to the latest known schema ("0.2.0").
  const versionKey = (
    version in VERSION_CONFIG ? version : "0.2.0"
  ) as keyof typeof VERSION_CONFIG;

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
    const _exhaustiveCheck: never = versionKey;
    throw new Error(`Unhandled health route version: ${versionKey}`);
  }
}
