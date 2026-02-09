import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

interface HealthRoutesOptions extends FastifyPluginOptions {
  version?: string; // e.g., "0.1.0" or "0.2.0"
}

/**
 * Health check routes plugin
 * Supports version-specific response formats
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  opts: HealthRoutesOptions = {},
) {
  const { version } = opts;
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
  const versionConfig = fastify.versionConfig;

  // Define schema properties
  const commonProps = {
    status: Type.String(),
  };

  const v1Props = {
    service: Type.String(),
    version: Type.String(),
    stableVersion: Type.String(),
    supportedVersions: Type.Array(Type.String()),
    deprecatedVersions: Type.Record(
      Type.String(),
      Type.Object({
        sunset: Type.Optional(Type.String()),
      }),
    ),
    timestamp: Type.String(),
  };

  const v2Props = {
    api: Type.Object({
      name: Type.String(),
      version: Type.String(),
    }),
    versions: Type.Object({
      stable: Type.String(),
      supported: Type.Array(Type.String()),
      deprecated: Type.Array(Type.String()),
      sunsetted: Type.Array(Type.String()),
    }),
    timestamp: Type.String(),
    uptime: Type.Number(),
  };

  // V1 Implementation
  if (version === "0.1.0") {
    server.get(
      "/",
      {
        schema: {
          description: "Health check endpoint",
          tags: ["health"],
          response: {
            200: Type.Object({
              ...commonProps,
              ...v1Props,
            }),
          },
        },
      },
      async (_request, _reply) => {
        return {
          status: "ok",
          service: "Symb0l API",
          version: versionConfig.stableVersion.full,
          stableVersion: versionConfig.stableVersion.full,
          supportedVersions: versionConfig.apiVersions.supported,
          deprecatedVersions: versionConfig.apiVersions.deprecated,
          timestamp: new Date().toISOString(),
        };
      },
    );
    return;
  }

  // V2 Implementation
  if (version === "0.2.0") {
    server.get(
      "/",
      {
        schema: {
          description: "Health check endpoint",
          tags: ["health"],
          response: {
            200: Type.Object({
              ...commonProps,
              ...v2Props,
            }),
          },
        },
      },
      async (_request, _reply) => {
        return {
          status: "healthy",
          api: {
            name: "Symb0l API",
            version: versionConfig.stableVersion.full,
          },
          versions: {
            stable: versionConfig.stableVersion.full,
            supported: versionConfig.apiVersions.supported,
            deprecated: Object.keys(versionConfig.apiVersions.deprecated),
            sunsetted: versionConfig.apiVersions.sunsetted,
          },
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };
      },
    );
    return;
  }

  // Fallback for unconfigured versions
  server.get(
    "/",
    {
      schema: {
        tags: ["health"],
        response: {
          200: Type.Object(
            {
              status: Type.String(),
            },
            { additionalProperties: true },
          ),
        },
      },
    },
    async (_request, _reply) => {
      return { status: "ok" };
    },
  );
}
