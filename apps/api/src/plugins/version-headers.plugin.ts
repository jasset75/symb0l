import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  resolveVersion,
  getVersionStatus,
  VersionStatus,
  type VersionConfig,
} from "../config/versions.config.js";

/**
 * Version headers plugin
 *
 * Adds version-related HTTP headers to all responses based on the resolved version.
 * Headers added:
 * - X-Resolved-Version: The actual version serving the request
 * - X-API-Stable-Version: The current stable version
 * - Deprecation: Date when version was deprecated (if applicable)
 * - Sunset: Date when version will be removed (if applicable)
 * - Link: Successor version URL (if deprecated)
 */
const versionHeadersPlugin: FastifyPluginAsync = async (fastify) => {
  const config: VersionConfig = fastify.versionConfig;

  fastify.addHook("onRequest", async (request, reply) => {
    // Extract version from URL path (e.g., /v1.2.0/quotes -> v1.2.0)
    const pathMatch = request.url.match(/^\/v?([\d.]+)/);
    const versionFromPath = pathMatch ? pathMatch[1] : "";

    // Resolve version (empty string resolves to stable)
    const resolvedVersion = resolveVersion(versionFromPath, config);
    const versionStatus = getVersionStatus(resolvedVersion, config);

    // Return 410 Gone for sunsetted versions
    if (versionStatus === VersionStatus.SUNSETTED) {
      return reply.code(410).send({
        statusCode: 410,
        error: "Gone",
        message: `API version ${resolvedVersion} has been sunset and is no longer available. Please upgrade to version ${config.stableVersion.full}.`,
        stableVersion: config.stableVersion.full,
      });
    }

    // Always add these headers
    reply.header("X-Resolved-Version", resolvedVersion);
    reply.header("X-API-Stable-Version", config.stableVersion.full);

    // Add deprecation headers if version is deprecated
    if (versionStatus === VersionStatus.DEPRECATED) {
      const deprecationInfo = config.deprecatedVersions.get(resolvedVersion);
      if (deprecationInfo) {
        // Format sunset date as HTTP date (RFC 7231)
        const sunsetDate = new Date(deprecationInfo.sunset);
        reply.header("Deprecation", sunsetDate.toUTCString());
        reply.header("Sunset", sunsetDate.toUTCString());

        // Add Link header pointing to stable version
        const stableVersion = config.stableVersion.full;
        const basePath = request.url.replace(/^\/v?[\d.]+/, "");
        reply.header(
          "Link",
          `</v${stableVersion}${basePath}>; rel="successor-version"`,
        );
      }
    }
  });
};

export default fp(versionHeadersPlugin, {
  name: "version-headers",
  fastify: "5.x",
  dependencies: ["version-resolver"],
});
