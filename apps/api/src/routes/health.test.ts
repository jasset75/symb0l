import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import Fastify, { FastifyInstance } from "fastify";
import { healthRoutes } from "../modules/health/index.js";
import versionResolverPlugin from "../plugins/version-resolver.plugin.js";

describe("Health Endpoint Versions", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(versionResolverPlugin);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("v0.1.0 Health Endpoint", () => {
    beforeEach(async () => {
      await app.register(healthRoutes, {
        prefix: "/v0.1.0/health",
        version: "0.1.0",
      });
    });

    it("should return v0.1.0 format with flat structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.1.0/health",
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, "ok");
      assert.strictEqual(body.service, "Symb0l API");
      assert.ok(body.version);
      assert.ok(body.stableVersion);
      assert.ok(Array.isArray(body.supportedVersions));
      assert.ok(typeof body.deprecatedVersions === "object");
      assert.ok(body.timestamp);
    });

    it("should not have uptime field", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.1.0/health",
      });

      const body = JSON.parse(response.body);
      assert.strictEqual(body.uptime, undefined);
    });

    it("should not have nested api or versions objects", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.1.0/health",
      });

      const body = JSON.parse(response.body);
      assert.strictEqual(body.api, undefined);
      assert.strictEqual(body.versions, undefined);
    });
  });

  describe("v0.2.0 Health Endpoint", () => {
    beforeEach(async () => {
      await app.register(healthRoutes, {
        prefix: "/v0.2.0/health",
        version: "0.2.0",
      });
    });

    it("should return v0.2.0 format with nested structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.2.0/health",
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, "healthy");
      assert.ok(body.api);
      assert.strictEqual(body.api.name, "Symb0l API");
      assert.ok(body.api.version);
      assert.ok(body.versions);
      assert.ok(body.versions.stable);
      assert.ok(Array.isArray(body.versions.supported));
      assert.ok(Array.isArray(body.versions.deprecated));
      assert.ok(Array.isArray(body.versions.sunsetted));
      assert.ok(body.timestamp);
    });

    it("should include uptime field", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.2.0/health",
      });

      const body = JSON.parse(response.body);
      assert.ok(typeof body.uptime === "number");
      assert.ok(body.uptime >= 0);
    });

    it("should have deprecated as array not object", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.2.0/health",
      });

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.versions.deprecated));
    });

    it("should include sunsetted versions", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0.2.0/health",
      });

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.versions.sunsetted));
    });
  });

  describe("Version Comparison", () => {
    beforeEach(async () => {
      await app.register(healthRoutes, {
        prefix: "/v0.1.0/health",
        version: "0.1.0",
      });
      await app.register(healthRoutes, {
        prefix: "/v0.2.0/health",
        version: "0.2.0",
      });
    });

    it("should return different response structures", async () => {
      const v010Response = await app.inject({
        method: "GET",
        url: "/v0.1.0/health",
      });
      const v020Response = await app.inject({
        method: "GET",
        url: "/v0.2.0/health",
      });

      const v010Body = JSON.parse(v010Response.body);
      const v020Body = JSON.parse(v020Response.body);

      // Different status values
      assert.strictEqual(v010Body.status, "ok");
      assert.strictEqual(v020Body.status, "healthy");

      // v0.1.0 has flat structure
      assert.strictEqual(v010Body.service, "Symb0l API");
      assert.strictEqual(v010Body.api, undefined);

      // v0.2.0 has nested structure
      assert.strictEqual(v020Body.service, undefined);
      assert.strictEqual(v020Body.api.name, "Symb0l API");

      // v0.2.0 has uptime, v0.1.0 doesn't
      assert.strictEqual(v010Body.uptime, undefined);
      assert.ok(typeof v020Body.uptime === "number");
    });
  });
});
