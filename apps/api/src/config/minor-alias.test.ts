import { describe, it } from "node:test";
import assert from "node:assert";
import {
  createVersionConfig,
  resolveVersion,
  getVersionStatus,
  VersionStatus,
  getVersionPrefixes,
} from "./versions.config.js";

describe("Minor Version Aliases", () => {
  it("should resolve v0.2 to the latest 0.2.x version", () => {
    const config = createVersionConfig();

    // Assuming 0.2.0 is supported or stable
    const has020 = config.apiVersions.supported.includes("0.2.0");
    assert.ok(has020, "0.2.0 should be supported for this test");

    // This should fail currently if aliases are not automatically generated
    // or if "v0.2" is not explicitly in aliases
    const resolved = resolveVersion("v0.2", config);

    // We expect it to resolve to 0.2.0 (or whatever the latest 0.2.x is)
    // Currently it likely returns "0.2" (as unknown) or stable version depending on logic
    // resolveVersion returns "0.2" if it's unknown

    assert.strictEqual(resolved, "0.2.0", "v0.2 should resolve to 0.2.0");
  });

  it("should include v0.2 in version prefixes", () => {
    const config = createVersionConfig();
    const prefixes = getVersionPrefixes(config);

    assert.ok(prefixes.includes("v0.2"), "v0.2 should be in version prefixes");
  });
});
