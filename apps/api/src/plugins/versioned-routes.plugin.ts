import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { gte } from "semver";
import { extractVersionFromPrefix } from "../config/versions.config.js";

interface VersionedRouteOptions extends FastifyPluginOptions {
  /**
   * Base path for the route (e.g., "/quotes", "/health")
   */
  basePath: string;

  /**
   * Minimum API version required for this route (e.g. "0.2.0")
   * If set, versions lower than this will not be registered
   */
  minVersion?: string;

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
  const { basePath, routePlugin, versionOptions = {}, minVersion } = opts;

  const versionPrefixes = fastify.getVersionPrefixes();
  const stableVersion = fastify.versionConfig.stableVersion.full;

  // Find the canonical prefix (stable version)
  const canonicalPrefix = `v${stableVersion}`;

  for (let i = 0; i < versionPrefixes.length; i++) {
    const versionPrefix = versionPrefixes[i];
    const isCanonical = versionPrefix === canonicalPrefix;

    // Extract version from prefix mechanism
    // 1. If prefix is empty, use stable version
    // 2. If prefix is an alias (e.g. "v0"), resolve it via config
    // 3. Otherwise assume it's "vX.Y.Z" and strip the 'v'
    const versionString = extractVersionFromPrefix(
      versionPrefix,
      fastify.versionConfig,
    );

    // Check minVersion constraint
    if (minVersion && !gte(versionString, minVersion)) {
      continue;
    }

    // Build full prefix
    // For quotes: /v0.2.0/quotes
    // For health: /v0.2.0 (health defines /health internally)
    const fullPrefix = versionPrefix
      ? `/${versionPrefix}${basePath}`
      : basePath;

    // Pass version to route plugin (empty string for default route seems to be the pattern)
    // But wait, previous logic passed empty string?
    // "const version = versionPrefix ? versionPrefix.substring(1) : "";"
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
