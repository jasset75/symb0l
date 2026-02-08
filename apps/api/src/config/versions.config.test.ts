import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseVersion,
  createVersionConfig,
  getVersionPrefixes,
  loadApiVersionConfig,
  resolveVersion,
  getVersionStatus,
  VersionStatus,
} from "./versions.config.js";

describe("Version Configuration", () => {
  describe("parseVersion", () => {
    it("should parse valid semantic version", () => {
      const version = parseVersion("1.2.3");
      assert.strictEqual(version.major, 1);
      assert.strictEqual(version.minor, 2);
      assert.strictEqual(version.patch, 3);
      assert.strictEqual(version.full, "1.2.3");
    });

    it("should parse version with zeros", () => {
      const version = parseVersion("0.0.1");
      assert.strictEqual(version.major, 0);
      assert.strictEqual(version.minor, 0);
      assert.strictEqual(version.patch, 1);
    });

    it("should throw on invalid version format", () => {
      assert.throws(() => parseVersion("1.2"), {
        message: /Invalid semantic version format/,
      });
      assert.throws(() => parseVersion("v1.2.3"), {
        message: /Invalid semantic version format/,
      });
      assert.throws(() => parseVersion("1.2.3-beta"), {
        message: /Invalid semantic version format/,
      });
    });
  });

  describe("loadApiVersionConfig", () => {
    it("should load config from api-version.json", () => {
      const config = loadApiVersionConfig();

      assert.ok(config.stable);
      assert.ok(typeof config.aliases === "object");
      assert.ok(Array.isArray(config.supported));
      assert.ok(typeof config.deprecated === "object");
      assert.ok(Array.isArray(config.sunsetted));
    });

    it("should have valid stable version", () => {
      const config = loadApiVersionConfig();
      assert.ok(config.stable.match(/^\d+\.\d+\.\d+$/));
    });
  });

  describe("createVersionConfig", () => {
    it("should create config from api-version.json", () => {
      const config = createVersionConfig();

      assert.ok(config.stableVersion);
      assert.ok(typeof config.stableVersion.major === "number");
      assert.ok(typeof config.stableVersion.minor === "number");
      assert.ok(typeof config.stableVersion.patch === "number");
      assert.ok(config.stableVersion.full);
    });

    it("should have apiVersions", () => {
      const config = createVersionConfig();

      assert.ok(config.apiVersions);
      assert.ok(config.apiVersions.stable);
      assert.ok(config.apiVersions.aliases);
      assert.ok(Array.isArray(config.apiVersions.supported));
    });

    it("should have supportedVersions array", () => {
      const config = createVersionConfig();

      assert.ok(Array.isArray(config.supportedVersions));
      assert.ok(config.supportedVersions.length > 0);
    });

    it("should have deprecatedVersions map", () => {
      const config = createVersionConfig();

      assert.ok(config.deprecatedVersions instanceof Map);
    });
  });

  describe("resolveVersion", () => {
    it("should resolve empty string to stable version", () => {
      const config = createVersionConfig();
      const resolved = resolveVersion("", config);

      assert.strictEqual(resolved, config.stableVersion.full);
    });

    it("should resolve alias to specific version", () => {
      const config = createVersionConfig();
      const alias = Object.keys(config.apiVersions.aliases)[0];

      if (alias) {
        const resolved = resolveVersion(alias, config);
        assert.strictEqual(resolved, config.apiVersions.aliases[alias]);
      }
    });

    it("should resolve exact version", () => {
      const config = createVersionConfig();
      const exactVersion = config.apiVersions.supported[0];

      const resolved = resolveVersion(`v${exactVersion}`, config);
      assert.strictEqual(resolved, exactVersion);
    });

    it("should handle version with or without v prefix", () => {
      const config = createVersionConfig();
      const version = config.stableVersion.full;

      const withV = resolveVersion(`v${version}`, config);
      const withoutV = resolveVersion(version, config);

      assert.strictEqual(withV, withoutV);
    });
  });

  describe("getVersionStatus", () => {
    it("should identify stable version", () => {
      const config = createVersionConfig();
      const status = getVersionStatus(config.stableVersion.full, config);

      assert.strictEqual(status, VersionStatus.STABLE);
    });

    it("should identify supported version", () => {
      const config = createVersionConfig();
      // Find a supported version that is not stable
      const supportedNonStable = config.apiVersions.supported.find(
        (v) => v !== config.stableVersion.full,
      );

      if (supportedNonStable) {
        const status = getVersionStatus(supportedNonStable, config);
        assert.strictEqual(status, VersionStatus.SUPPORTED);
      }
    });

    it("should identify deprecated version", () => {
      const config = createVersionConfig();
      const deprecatedVersions = Object.keys(config.apiVersions.deprecated);

      if (deprecatedVersions.length > 0) {
        const status = getVersionStatus(deprecatedVersions[0], config);
        assert.strictEqual(status, VersionStatus.DEPRECATED);
      }
    });

    it("should identify sunsetted version", () => {
      const config = createVersionConfig();
      const sunsettedVersions = config.apiVersions.sunsetted;

      if (sunsettedVersions.length > 0) {
        const status = getVersionStatus(sunsettedVersions[0], config);
        assert.strictEqual(status, VersionStatus.SUNSETTED);
      }
    });

    it("should identify unknown version", () => {
      const config = createVersionConfig();
      const status = getVersionStatus("99.99.99", config);

      assert.strictEqual(status, VersionStatus.UNKNOWN);
    });
  });

  describe("getVersionPrefixes", () => {
    it("should return array of prefixes", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      assert.ok(Array.isArray(prefixes));
      assert.ok(prefixes.length > 0);
    });

    it("should include supported versions", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      for (const version of config.apiVersions.supported) {
        assert.ok(prefixes.includes(`v${version}`));
      }
    });

    it("should include deprecated versions", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      for (const version of Object.keys(config.apiVersions.deprecated)) {
        assert.ok(prefixes.includes(`v${version}`));
      }
    });

    it("should include sunsetted versions", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      for (const version of config.apiVersions.sunsetted) {
        assert.ok(prefixes.includes(`v${version}`));
      }
    });

    it("should include aliases", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      for (const alias of Object.keys(config.apiVersions.aliases)) {
        assert.ok(prefixes.includes(alias));
      }
    });

    it("should include empty string for default", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      assert.ok(prefixes.includes(""));
    });
  });
});
