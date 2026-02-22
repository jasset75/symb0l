import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  createVersionConfig,
  getVersionPrefixes,
  type VersionConfig,
} from "../config/versions.config.js";

/**
 * Version resolver plugin
 *
 * Decorates the Fastify instance with version configuration and utilities.
 * This makes version information available throughout the application.
 */
const versionResolverPlugin: FastifyPluginAsync = async (fastify) => {
  const config = createVersionConfig();

  // Decorate instance with version config
  fastify.decorate("versionConfig", config);

  // Decorate instance with helper to get version prefixes
  fastify.decorate("getVersionPrefixes", () => getVersionPrefixes(config));

  // Log version information on startup
  fastify.log.info(
    {
      stableVersion: config.stableVersion.full,
      supportedVersions: config.apiVersions.supported,
      deprecatedVersions: Object.keys(config.apiVersions.deprecated),
      aliases: config.apiVersions.aliases,
    },
    "API version configuration loaded",
  );
};

export default fp(versionResolverPlugin, {
  name: "version-resolver",
  fastify: "5.x",
});
