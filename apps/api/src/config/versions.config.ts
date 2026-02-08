import { readFileSync } from "fs";
import { join } from "path";

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
 * Version configuration for API versioning
 */
export interface VersionConfig {
  /** Current version from package.json */
  current: SemanticVersion;
  /** Map of major version aliases to specific versions */
  majorAliases: Map<string, string>;
  /** Default version for unversioned endpoints */
  defaultVersion: string;
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
 * Load version from package.json
 */
function loadPackageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf-8"),
  );
  return packageJson.version;
}

/**
 * Create version configuration
 *
 * This is the single source of truth for API versioning.
 *
 * To update version mappings:
 * 1. Update package.json version
 * 2. Update majorAliases map to point to new version
 * 3. Optionally update defaultVersion
 */
export function createVersionConfig(): VersionConfig {
  const currentVersion = loadPackageVersion();
  const parsed = parseVersion(currentVersion);

  // Map major versions to specific releases
  // Update these mappings when releasing new minor/patch versions
  const majorAliases = new Map<string, string>([
    // v0 always points to latest 0.x.x release
    ["v0", currentVersion],

    // Future major versions can be added here:
    // ['v1', '1.2.3'],
    // ['v2', '2.0.0'],
  ]);

  return {
    current: parsed,
    majorAliases,
    // Default version for unversioned endpoints (e.g., /quotes/:symbol)
    // This should typically point to the latest stable major version
    defaultVersion: `v${parsed.major}`,
  };
}

/**
 * Get all version prefixes that should be registered
 * Returns: [exact version, major alias, default (empty string)]
 *
 * Example for version 0.1.0:
 * - '/v0.1.0' (exact)
 * - '/v0' (major alias)
 * - '' (default, no prefix)
 */
export function getVersionPrefixes(config: VersionConfig): string[] {
  const exactVersion = `v${config.current.full}`;
  const majorVersion = `v${config.current.major}`;

  return [
    exactVersion, // e.g., 'v0.1.0'
    majorVersion, // e.g., 'v0'
    "", // default (no version prefix)
  ];
}
