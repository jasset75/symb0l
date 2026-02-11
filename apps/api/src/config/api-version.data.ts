import { ApiVersionConfigType } from "./api-version.schema.js";

/**
 * API Version Data
 *
 * This file contains the raw configuration for API versions.
 * It is validated against the schema in `api-version.config.ts`.
 *
 * - stable: Current default version
 * - aliases: Shortcuts like 'v0' mapping to specific versions
 * - supported: Versions that are active and working
 * - deprecated: Versions that will be removed soon (with sunset dates)
 * - sunsetted: Versions that have been removed
 */
export const API_VERSION_DATA = {
  stable: "0.2.0",
  aliases: {
    v0: "0.2.0",
  },
  supported: ["0.1.0", "0.2.0"],
  deprecated: {
    "0.1.0": {
      sunset: "2027-02-08T00:00:00Z",
    },
  },
  sunsetted: [],
} as const satisfies ApiVersionConfigType;
