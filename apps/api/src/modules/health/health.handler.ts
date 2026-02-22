import { FastifyRequest, FastifyReply } from "fastify";
import { HealthV1Type, HealthV2Type } from "./health.schema.js";

export async function handleHealthV1(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<HealthV1Type> {
  const versionConfig = request.server.versionConfig;

  return {
    status: "ok",
    service: "Symb0l API",
    version: versionConfig.stable,
    stableVersion: versionConfig.stable,
    supportedVersions: [...versionConfig.apiVersions.supported],
    deprecatedVersions: versionConfig.apiVersions.deprecated,
    timestamp: new Date().toISOString(),
  };
}

export async function handleHealthV2(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<HealthV2Type> {
  const versionConfig = request.server.versionConfig;

  return {
    status: "healthy",
    api: {
      name: "Symb0l API",
      version: versionConfig.stable,
    },
    versions: {
      stable: versionConfig.stable,
      supported: [...versionConfig.apiVersions.supported],
      deprecated: Object.keys(versionConfig.apiVersions.deprecated),
      sunsetted: [...versionConfig.apiVersions.sunsetted],
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
