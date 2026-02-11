import { Type, Static } from "@sinclair/typebox";
import { FormatRegistry } from "@sinclair/typebox/type";

/**
 * Register date-time string format validation
 * This is needed for the sunset date validation
 */
FormatRegistry.Set("date-time", (value) => {
  return !isNaN(Date.parse(value));
});

/**
 * Schema for deprecation information
 */
export const DeprecatedVersionInfoSchema = Type.Object(
  {
    sunset: Type.String({
      format: "date-time",
      description: "ISO 8601 date-time when this version will be removed",
    }),
  },
  {
    $id: "DeprecatedVersionInfo",
    description: "Deprecation information for a specific API version",
  },
);

/**
 * Schema for API version configuration
 */
export const ApiVersionConfigSchema = Type.Object(
  {
    stable: Type.String({
      pattern: "^\\d+\\.\\d+\\.\\d+$",
      description: "Current stable version (semantic version format)",
    }),
    aliases: Type.Record(Type.String(), Type.String(), {
      description: "Version aliases (e.g., 'v0' -> '0.2.0')",
    }),
    supported: Type.Readonly(
      Type.Array(Type.String(), {
        description: "List of all supported versions",
      }),
    ),
    deprecated: Type.Record(Type.String(), DeprecatedVersionInfoSchema, {
      description: "Deprecated versions with sunset dates",
    }),
    sunsetted: Type.Readonly(
      Type.Array(Type.String(), {
        description: "Versions that are no longer available",
      }),
    ),
  },
  {
    $id: "ApiVersionConfig",
    description: "Complete API version configuration",
  },
);

/**
 * Type exports for use throughout the codebase
 */
export type DeprecatedVersionInfo = Static<typeof DeprecatedVersionInfoSchema>;
export type ApiVersionConfigType = Static<typeof ApiVersionConfigSchema>;
