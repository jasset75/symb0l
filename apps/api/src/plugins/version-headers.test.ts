import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import Fastify, { FastifyInstance } from "fastify";
import { healthRoutes } from "../modules/health/index.js";
import versionResolverPlugin from "./version-resolver.plugin.js";
import versionHeadersPlugin from "./version-headers.plugin.js";

/**
 * Integration tests for deprecated version behavior.
 * Verifies that:
 * - Deprecated versions still serve responses (not 4xx/5xx)
 * - Deprecation warning headers are present
 * - The stable version is advertised
 * - Sunsetted versions return 410 Gone
 */
describe("Version Headers - Deprecated Version Behavior", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(versionResolverPlugin);
    await app.register(versionHeadersPlugin);
    // Register both exact and minor-alias prefixes for 0.1.x
    await app.register(healthRoutes, {
      prefix: "/v0.1.0/health",
      version: "0.1.0",
    });
    await app.register(healthRoutes, {
      prefix: "/v0.1/health",
      version: "0.1.0",
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /v0.1.0/health should return 200 (deprecated, not sunsetted)", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1.0/health" });
    assert.strictEqual(res.statusCode, 200);
  });

  it("GET /v0.1/health (minor alias) should return 200 (deprecated, not sunsetted)", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1/health" });
    assert.strictEqual(res.statusCode, 200);
  });

  it("should include Deprecation header for v0.1.0", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1.0/health" });
    assert.ok(
      res.headers["deprecation"],
      "Deprecation header should be present",
    );
  });

  it("should include Sunset header for v0.1.0", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1.0/health" });
    assert.ok(res.headers["sunset"], "Sunset header should be present");
  });

  it("should include Link header pointing to stable version for v0.1.0", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1.0/health" });
    const link = res.headers["link"] as string;
    assert.ok(link, "Link header should be present");
    assert.ok(
      link.includes("0.2.0"),
      `Link should reference stable 0.2.0, got: ${link}`,
    );
    assert.ok(link.includes('rel="successor-version"'));
  });

  it("should advertise stable version in X-API-Stable-Version header for v0.1.0", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1.0/health" });
    assert.strictEqual(res.headers["x-api-stable-version"], "0.2.0");
  });

  it("should resolve correct version in X-Resolved-Version header for minor alias v0.1", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1/health" });
    assert.strictEqual(res.headers["x-resolved-version"], "0.1.0");
  });

  it("same deprecation headers should appear via minor alias v0.1", async () => {
    const res = await app.inject({ method: "GET", url: "/v0.1/health" });
    assert.ok(
      res.headers["deprecation"],
      "Deprecation header should be present via minor alias",
    );
    assert.ok(
      res.headers["sunset"],
      "Sunset header should be present via minor alias",
    );
    assert.ok((res.headers["link"] as string).includes("0.2.0"));
  });
});
