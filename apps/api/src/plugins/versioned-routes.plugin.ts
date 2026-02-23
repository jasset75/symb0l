import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { gte } from "semver";
import { resolveVersion } from "../config/versions.config.js";

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
  const canonicalPrefix = `v${fastify.versionConfig.stable}`;

  for (const versionPrefix of versionPrefixes) {
    const isCanonical = versionPrefix === canonicalPrefix;

    // Resolve what full version this prefix maps to
    const versionString = resolveVersion(versionPrefix, fastify.versionConfig);

    // Check minVersion constraint
    if (minVersion && !gte(versionString, minVersion)) {
      continue;
    }

    // Build full prefix
    const fullPrefix = versionPrefix
      ? `/${versionPrefix}${basePath}`
      : basePath;

    const version = versionPrefix ? versionPrefix.substring(1) : "";

    // Get version-specific options if provided
    const versionSpecificOpts = version ? (versionOptions[version] ?? {}) : {};

    // Register route
    await fastify.register(routePlugin, {
      prefix: fullPrefix,
      hideFromSwagger: !isCanonical,
      version,
      ...versionSpecificOpts,
    });

    fastify.log.info(
      `Registered ${basePath} at: ${fullPrefix} ${isCanonical ? "(documented in Swagger)" : "(hidden from Swagger)"}`,
    );
  }
}
