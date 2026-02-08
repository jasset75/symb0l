import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  createVersionConfig,
  getVersionPrefixes,
  type VersionConfig,
} from "../config/versions.config.js";

/**
 * Extend Fastify instance with version utilities
 */
declare module "fastify" {
  interface FastifyInstance {
    versionConfig: VersionConfig;
    getVersionPrefixes: () => string[];
  }
}

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
      version: config.current.full,
      majorAliases: Array.from(config.majorAliases.entries()),
      defaultVersion: config.defaultVersion,
    },
    "API version configuration loaded",
  );
};

export default fp(versionResolverPlugin, {
  name: "version-resolver",
  fastify: "5.x",
});
