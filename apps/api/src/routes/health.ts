import { FastifyInstance, FastifyPluginOptions } from "fastify";

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

  // Get version config
  const versionConfig = fastify.versionConfig;

  fastify.get(
    "/", // basePath will provide "/health"
    {
      schema: {
        description: "Health check endpoint",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              ...(version === "0.2.0" && {
                api: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    version: { type: "string" },
                  },
                },
                versions: {
                  type: "object",
                  properties: {
                    stable: { type: "string" },
                    supported: { type: "array", items: { type: "string" } },
                    deprecated: { type: "array", items: { type: "string" } },
                    sunsetted: { type: "array", items: { type: "string" } },
                  },
                },
                timestamp: { type: "string" },
                uptime: { type: "number" },
              }),
            },
          },
        },
      },
    },
    async (request, reply) => {
      // v0.1.0 format: flat structure
      if (version === "0.1.0") {
        return {
          status: "ok",
          service: "Symb0l API",
          version: versionConfig.stableVersion.full,
          stableVersion: versionConfig.stableVersion.full,
          supportedVersions: versionConfig.apiVersions.supported,
          deprecatedVersions: versionConfig.apiVersions.deprecated,
          timestamp: new Date().toISOString(),
        };
      }

      // v0.2.0+ format: nested structure with uptime
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
}
