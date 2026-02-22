import { gt, minor, major, valid } from "semver";
import { API_VERSION_CONFIG } from "./api-version.config.js";

/**
 * Deprecation information for a version
 */
export interface DeprecatedVersionInfo {
  sunset: string; // ISO date string
}

/**
 * API version configuration
 * Re-export type from api-version.config for backward compatibility
 */
export interface ApiVersionConfig {
  stable: string;
  aliases: Record<string, string>;
  supported: string[];
  deprecated: Record<string, DeprecatedVersionInfo>;
  sunsetted: readonly string[];
}

/**
 * Version status enum
 */
export enum VersionStatus {
  STABLE = "stable",
  SUPPORTED = "supported",
  DEPRECATED = "deprecated",
  SUNSETTED = "sunsetted",
  UNKNOWN = "unknown",
}

/**
 * Version configuration for API versioning
 */
export interface VersionConfig {
  /** Raw API version configuration */
  apiVersions: ApiVersionConfig;
  /** Current stable version string */
  stable: string;
  /** All known full versions: supported + deprecated + sunsetted */
  allVersions: string[];
}

/**
 * Create version configuration from the static config file.
 * This is the single source of truth for API versioning.
 */
export function createVersionConfig(): VersionConfig {
  const apiVersions = API_VERSION_CONFIG as ApiVersionConfig;

  const allVersions = [
    ...apiVersions.supported,
    ...Object.keys(apiVersions.deprecated),
    ...apiVersions.sunsetted,
  ];

  return {
    apiVersions,
    stable: apiVersions.stable,
    allVersions: [...new Set(allVersions)],
  };
}

/**
 * Find the latest patch version for a given major.minor among all known versions.
 *
 * @example latestPatchFor("0.2", config) // "0.2.0"
 */
export function latestPatchFor(
  majorMinor: string,
  config: VersionConfig,
): string | null {
  return config.allVersions
    .filter(
      (v) =>
        major(v) === major(majorMinor + ".0") &&
        minor(v) === minor(majorMinor + ".0"),
    )
    .reduce<
      string | null
    >((latest, v) => (latest === null || gt(v, latest) ? v : latest), null);
}

/**
 * Resolve a version string from a URL to its full semver version.
 *
 * Handles:
 * - Empty string → stable version
 * - Static alias (e.g. "v0") → aliased version
 * - Exact version (e.g. "v0.2.0") → that version if known
 * - Minor alias (e.g. "v0.2") → latest 0.2.x patch
 *
 * @param versionString - Version string from URL (e.g., 'v0', 'v0.2', 'v0.2.0', or '')
 * @param config - Version configuration
 * @returns Resolved semver string (e.g., '0.2.0')
 */
export function resolveVersion(
  versionString: string,
  config: VersionConfig,
): string {
  if (!versionString) {
    return config.stable;
  }

  // Ensure 'v' prefix for alias lookups
  const withPrefix = versionString.startsWith("v")
    ? versionString
    : `v${versionString}`;
  const bare = withPrefix.slice(1);

  // 1. Static alias (e.g. "v0" → "0.2.0")
  if (config.apiVersions.aliases[withPrefix]) {
    return config.apiVersions.aliases[withPrefix];
  }

  // 2. Exact known version (e.g. "v0.2.0")
  if (valid(bare) && config.allVersions.includes(bare)) {
    return bare;
  }

  // 3. Minor alias (e.g. "v0.2" → latest 0.2.x)
  if (/^\d+\.\d+$/.test(bare)) {
    return latestPatchFor(bare, config) ?? bare;
  }

  // Unknown — pass through and let caller handle
  return bare;
}

/**
 * Get the status of a resolved full version string.
 *
 * @param version - Full semver string (e.g., '0.2.0')
 * @param config - Version configuration
 */
export function getVersionStatus(
  version: string,
  config: VersionConfig,
): VersionStatus {
  if (version === config.stable) return VersionStatus.STABLE;
  if (config.apiVersions.sunsetted.includes(version))
    return VersionStatus.SUNSETTED;
  if (config.apiVersions.deprecated[version]) return VersionStatus.DEPRECATED;
  if (config.apiVersions.supported.includes(version))
    return VersionStatus.SUPPORTED;
  return VersionStatus.UNKNOWN;
}

/**
 * Get all route prefixes that should be registered by the versioned routes plugin.
 *
 * Returns exact version prefixes (vX.Y.Z), dynamic minor aliases (vX.Y),
 * static aliases (e.g. v0), and the default empty string.
 */
export function getVersionPrefixes(config: VersionConfig): string[] {
  const exact = config.allVersions.map((v) => `v${v}`);

  const minors = config.allVersions.map((v) => `v${major(v)}.${minor(v)}`);

  const aliases = Object.keys(config.apiVersions.aliases);

  return [...new Set([...exact, ...minors, ...aliases, ""])];
}
