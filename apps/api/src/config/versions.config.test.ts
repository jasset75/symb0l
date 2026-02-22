import { describe, it } from "node:test";
import assert from "node:assert";
import { major } from "semver";
import {
  createVersionConfig,
  getVersionPrefixes,
  resolveVersion,
  getVersionStatus,
  latestPatchFor,
  VersionStatus,
} from "./versions.config.js";

describe("Version Configuration", () => {
  describe("createVersionConfig", () => {
    it("should create config from API_VERSION_CONFIG", () => {
      const config = createVersionConfig();

      assert.ok(config.stable);
      assert.ok(typeof config.stable === "string");
      assert.ok(config.allVersions.length > 0);
    });

    it("should have apiVersions", () => {
      const config = createVersionConfig();

      assert.ok(config.apiVersions);
      assert.ok(config.apiVersions.stable);
      assert.ok(config.apiVersions.aliases);
      assert.ok(Array.isArray(config.apiVersions.supported));
    });

    it("should have allVersions combining supported + deprecated + sunsetted", () => {
      const config = createVersionConfig();
      assert.ok(Array.isArray(config.allVersions));
      assert.ok(config.allVersions.length > 0);

      for (const v of config.apiVersions.supported) {
        assert.ok(config.allVersions.includes(v));
      }
    });
  });

  describe("resolveVersion", () => {
    it("should resolve empty string to stable version", () => {
      const config = createVersionConfig();
      const resolved = resolveVersion("", config);

      assert.strictEqual(resolved, config.stable);
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
      const version = config.stable;

      const withV = resolveVersion(`v${version}`, config);
      const withoutV = resolveVersion(version, config);

      assert.strictEqual(withV, withoutV);
    });
  });

  describe("latestPatchFor", () => {
    it("should resolve minor alias to latest patch", () => {
      const config = createVersionConfig();
      const result = latestPatchFor("0.2", config);
      assert.strictEqual(result, "0.2.0");
    });

    it("should return null for unknown minor", () => {
      const config = createVersionConfig();
      const result = latestPatchFor("9.9", config);
      assert.strictEqual(result, null);
    });
  });

  describe("getVersionStatus", () => {
    it("should identify stable version", () => {
      const config = createVersionConfig();
      const status = getVersionStatus(config.stable, config);

      assert.strictEqual(status, VersionStatus.STABLE);
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
