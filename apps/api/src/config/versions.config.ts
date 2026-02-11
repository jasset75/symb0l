import { API_VERSION_CONFIG } from "./api-version.config.js";

/**
 * Semantic version structure
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  full: string;
}

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
  /** API version configuration from api-version.json */
  apiVersions: ApiVersionConfig;
  /** Current stable version */
  stableVersion: SemanticVersion;
  /** All supported versions (parsed) */
  supportedVersions: SemanticVersion[];
  /** All deprecated versions (parsed) */
  deprecatedVersions: Map<string, DeprecatedVersionInfo>;
}

/**
 * Parse semantic version string into components
 */
export function parseVersion(versionString: string): SemanticVersion {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(
      `Invalid semantic version format: ${versionString}. Expected format: X.Y.Z`,
    );
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    full: versionString,
  };
}

/**
 * Create version configuration from TypeScript config
 *
 * This is the single source of truth for API versioning.
 */
export function createVersionConfig(): VersionConfig {
  const apiVersions = API_VERSION_CONFIG as ApiVersionConfig;

  const stableVersion = parseVersion(apiVersions.stable);
  const supportedVersions = apiVersions.supported.map(parseVersion);
  const deprecatedVersions = new Map(Object.entries(apiVersions.deprecated));

  return {
    apiVersions,
    stableVersion,
    supportedVersions,
    deprecatedVersions,
  };
}

/**
 * Resolve a version string to its actual version
 *
 * @param versionString - Version string from URL (e.g., 'v1', 'v1.2.0', or empty for default)
 * @param config - Version configuration
 * @returns Resolved version string (e.g., '1.2.0')
 */
export function resolveVersion(
  versionString: string,
  config: VersionConfig,
): string {
  // Default (empty) -> stable version
  if (!versionString || versionString === "") {
    return config.stableVersion.full;
  }

  // Remove 'v' prefix if present
  const normalized = versionString.startsWith("v")
    ? versionString
    : `v${versionString}`;

  // Check if it's an alias (e.g., 'v1')
  if (config.apiVersions.aliases[normalized]) {
    return config.apiVersions.aliases[normalized];
  }

  // Check if it's an exact version (e.g., 'v1.2.0')
  const exactVersion = normalized.substring(1); // Remove 'v'
  if (
    config.apiVersions.supported.includes(exactVersion) ||
    config.apiVersions.deprecated[exactVersion]
  ) {
    return exactVersion;
  }

  // Unknown version - return as-is and let caller handle
  return exactVersion;
}

/**
 * Get the status of a version
 *
 * @param version - Version string (e.g., '1.2.0')
 * @param config - Version configuration
 * @returns Version status
 */
export function getVersionStatus(
  version: string,
  config: VersionConfig,
): VersionStatus {
  if (version === config.stableVersion.full) {
    return VersionStatus.STABLE;
  }

  if (config.apiVersions.sunsetted.includes(version)) {
    return VersionStatus.SUNSETTED;
  }

  if (config.apiVersions.deprecated[version]) {
    return VersionStatus.DEPRECATED;
  }

  if (config.apiVersions.supported.includes(version)) {
    return VersionStatus.SUPPORTED;
  }

  return VersionStatus.UNKNOWN;
}

/**
 * Get all version prefixes that should be registered
 * Returns all supported and deprecated versions, plus aliases
 *
 * Example:
 * - 'v0.1.0' (exact supported)
 * - 'v1.0.0' (exact deprecated)
 * - 'v0' (alias)
 * - '' (default, resolves to stable)
 */
export function getVersionPrefixes(config: VersionConfig): string[] {
  const prefixes: string[] = [];

  // Add all supported versions
  // Note: Deprecated versions may overlap with supported (deprecation flow)
  // So we track what we've added to avoid duplicates
  for (const version of config.apiVersions.supported) {
    prefixes.push(`v${version}`);
  }

  // Add deprecated versions that aren't already in supported
  for (const version of Object.keys(config.apiVersions.deprecated)) {
    const prefix = `v${version}`;
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  }

  // Add sunsetted versions that aren't already added
  for (const version of config.apiVersions.sunsetted) {
    const prefix = `v${version}`;
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }
  }

  // Add all aliases
  for (const alias of Object.keys(config.apiVersions.aliases)) {
    if (!prefixes.includes(alias)) {
      prefixes.push(alias);
    }
  }

  // Add default (empty string)
  prefixes.push("");

  return prefixes;
}
