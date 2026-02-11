import { Value } from "@sinclair/typebox/value";
import {
  ApiVersionConfigSchema,
  DeprecatedVersionInfoSchema,
} from "./api-version.schema.js";
import type {
  ApiVersionConfigType,
  DeprecatedVersionInfo,
} from "./api-version.schema.js";
import { API_VERSION_DATA } from "./api-version.data.js";

/**
 * Re-export types and schemas for use throughout the codebase
 */
export {
  ApiVersionConfigSchema,
  DeprecatedVersionInfoSchema,
  API_VERSION_DATA,
};

export type { ApiVersionConfigType, DeprecatedVersionInfo };

/**
 * Validated API Version Configuration
 *
 * This is the single source of truth for API versioning.
 * It combines the data from `api-version.data.ts` with validation logic.
 */
export const API_VERSION_CONFIG =
  API_VERSION_DATA as unknown as ApiVersionConfigType;

/**
 * Validate configuration at module load time
 */
const validationResult = Value.Check(
  ApiVersionConfigSchema,
  API_VERSION_CONFIG,
);

if (!validationResult) {
  const errors = [...Value.Errors(ApiVersionConfigSchema, API_VERSION_CONFIG)];
  const errorMessages = errors
    .map((err) => `${err.path}: ${err.message}`)
    .join("\n");
  throw new Error(`API version configuration is invalid:\n${errorMessages}`);
}

/**
 * Additional runtime validation rules that TypeBox can't express
 */
function validateConfigRules(): void {
  const config = API_VERSION_CONFIG;

  // Validate stable is not sunsetted
  if ((config.sunsetted as readonly string[]).includes(config.stable)) {
    throw new Error(
      `Stable version ${config.stable} cannot be in sunsetted list`,
    );
  }

  // Validate stable is not deprecated
  if (Object.keys(config.deprecated).includes(config.stable)) {
    throw new Error(
      `Stable version ${config.stable} cannot be in deprecated list`,
    );
  }

  // Validate no version is both sunsetted and supported
  for (const version of config.sunsetted) {
    if (config.supported.includes(version)) {
      throw new Error(
        `Version ${version} cannot be both sunsetted and supported`,
      );
    }
  }

  // Validate no version is both sunsetted and deprecated
  for (const version of config.sunsetted) {
    if (Object.keys(config.deprecated).includes(version)) {
      throw new Error(
        `Version ${version} cannot be both sunsetted and deprecated`,
      );
    }
  }

  // Validate no duplicate versions in supported list
  const allVersions = new Set<string>();
  const duplicates: string[] = [];

  for (const version of config.supported) {
    if (allVersions.has(version)) {
      duplicates.push(version);
    }
    allVersions.add(version);
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate versions found in supported list: ${duplicates.join(", ")}`,
    );
  }
}

// Run additional validation
validateConfigRules();

/**
 * Export schemas for testing purposes
 */
export const schemas = {
  DeprecatedVersionInfoSchema,
  ApiVersionConfigSchema,
};
