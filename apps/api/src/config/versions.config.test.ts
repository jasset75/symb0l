import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseVersion,
  createVersionConfig,
  getVersionPrefixes,
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

  describe("createVersionConfig", () => {
    it("should create config from package.json", () => {
      const config = createVersionConfig();

      assert.ok(config.current);
      assert.ok(typeof config.current.major === "number");
      assert.ok(typeof config.current.minor === "number");
      assert.ok(typeof config.current.patch === "number");
      assert.ok(config.current.full);
    });

    it("should have major aliases map", () => {
      const config = createVersionConfig();

      assert.ok(config.majorAliases instanceof Map);
      assert.ok(config.majorAliases.size > 0);
    });

    it("should have default version", () => {
      const config = createVersionConfig();

      assert.ok(config.defaultVersion);
      assert.ok(config.defaultVersion.startsWith("v"));
    });

    it("should map major version to current version", () => {
      const config = createVersionConfig();
      const majorKey = `v${config.current.major}`;

      assert.strictEqual(
        config.majorAliases.get(majorKey),
        config.current.full,
      );
    });
  });

  describe("getVersionPrefixes", () => {
    it("should return three prefixes", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      assert.strictEqual(prefixes.length, 3);
    });

    it("should include exact version prefix", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      const exactVersion = `v${config.current.full}`;
      assert.ok(prefixes.includes(exactVersion));
    });

    it("should include major version prefix", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      const majorVersion = `v${config.current.major}`;
      assert.ok(prefixes.includes(majorVersion));
    });

    it("should include empty string for default", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      assert.ok(prefixes.includes(""));
    });

    it("should have prefixes in correct order", () => {
      const config = createVersionConfig();
      const prefixes = getVersionPrefixes(config);

      assert.strictEqual(prefixes[0], `v${config.current.full}`);
      assert.strictEqual(prefixes[1], `v${config.current.major}`);
      assert.strictEqual(prefixes[2], "");
    });
  });
});
