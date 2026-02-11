import { FastifyInstance, FastifyPluginOptions } from "fastify";

interface VersionedRouteOptions extends FastifyPluginOptions {
  /**
   * Base path for the route (e.g., "/quotes", "/health")
   */
  basePath: string;

  /**
   * Route registration function
   * Should accept (fastify, opts) where opts may include hideFromSwagger
   */
  routePlugin: (
    fastify: FastifyInstance,
    opts: FastifyPluginOptions & { hideFromSwagger?: boolean },
  ) => Promise<void>;

  /**
   * Optional version-specific options to pass to the route plugin
   * Key is the version string (e.g., "0.1.0"), value is the options
   */
  versionOptions?: Record<string, any>;
}

/**
 * Helper plugin to register versioned routes
 * Automatically registers:
 * - Canonical route (stable version) - documented in Swagger
 * - All alias routes - hidden from Swagger
 * - Default route (no version prefix) - hidden from Swagger
 */
export async function registerVersionedRoutes(
  fastify: FastifyInstance,
  opts: VersionedRouteOptions,
) {
  const { basePath, routePlugin, versionOptions = {} } = opts;

  const versionPrefixes = fastify.getVersionPrefixes();
  const stableVersion = fastify.versionConfig.stableVersion.full;

  // Find the canonical prefix (stable version)
  const canonicalPrefix = `v${stableVersion}`;

  for (let i = 0; i < versionPrefixes.length; i++) {
    const versionPrefix = versionPrefixes[i];
    const isCanonical = versionPrefix === canonicalPrefix;

    // Build full prefix
    // For quotes: /v0.2.0/quotes
    // For health: /v0.2.0 (health defines /health internally)
    const fullPrefix = versionPrefix
      ? `/${versionPrefix}${basePath}`
      : basePath;

    // Extract version from prefix (e.g., "v0.2.0" -> "0.2.0")
    const version = versionPrefix ? versionPrefix.substring(1) : "";

    // Get version-specific options if provided
    const versionSpecificOpts = version ? versionOptions[version] || {} : {};

    // Register route
    await fastify.register(routePlugin, {
      prefix: fullPrefix,
      hideFromSwagger: !isCanonical, // Hide everything except canonical
      version, // Pass version to route plugin
      ...versionSpecificOpts,
    });

    const swaggerStatus = isCanonical
      ? "(documented in Swagger)"
      : "(hidden from Swagger)";

    fastify.log.info(
      `Registered ${basePath} at: ${fullPrefix} ${swaggerStatus}`,
    );
  }
}
