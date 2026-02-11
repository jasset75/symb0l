import { describe, it } from "node:test";
import assert from "node:assert";
import { Value } from "@sinclair/typebox/value";
import {
  API_VERSION_CONFIG,
  ApiVersionConfigSchema,
  schemas,
} from "./api-version.config.js";

describe("API Version Configuration Validation", () => {
  describe("TypeBox Schema Validation", () => {
    it("should validate the current configuration", () => {
      const isValid = Value.Check(ApiVersionConfigSchema, API_VERSION_CONFIG);
      assert.ok(
        isValid,
        "Current configuration should be valid according to schema",
      );
    });

    it("should reject invalid semantic version format", () => {
      const invalidConfig = {
        ...API_VERSION_CONFIG,
        stable: "v1.0", // Invalid format (needs X.Y.Z)
      };

      const isValid = Value.Check(ApiVersionConfigSchema, invalidConfig);
      assert.strictEqual(
        isValid,
        false,
        "Should reject invalid semantic version",
      );
    });

    it("should validate deprecated version info structure", () => {
      const validInfo = { sunset: "2025-01-01T00:00:00Z" };
      assert.ok(
        Value.Check(schemas.DeprecatedVersionInfoSchema, validInfo),
        "Should accept valid sunset date",
      );

      const invalidInfo = { sunset: "not-a-date" };
      assert.strictEqual(
        Value.Check(schemas.DeprecatedVersionInfoSchema, invalidInfo),
        false,
        "Should reject invalid date format",
      );
    });
  });

  // Note: The logic validation rules (e.g. "stable cannot be sunsetted")
  // are implemented as runtime checks in api-version.config.ts and run on module load.
  // Testing them would require isolation/mocking of the module loading process,
  // which is complex. Since we have type safety and schema validation,
  // we rely on the schema tests above and the runtime checks.
});
