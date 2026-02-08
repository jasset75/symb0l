import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { quoteRoutes } from "./quotes.js";
import { ErrorSchema, QuoteSchema } from "../schemas/common.js";
import versionResolverPlugin from "../plugins/version-resolver.plugin.js";

// Mock quote service for testing
const mockQuoteServicePlugin = fp(async (fastify) => {
  const mockQuoteService = {
    provider: null as any, // Mock provider (not used in tests)
    async getQuote(symbol: string) {
      // Simulate valid symbols
      if (symbol === "AAPL" || symbol === "GOOGL" || symbol === "MSFT") {
        return {
          symbol,
          price: 150.25,
          currency: "USD",
          timestamp: new Date().toISOString(),
        };
      }
      // Return null for invalid symbols (triggers 404)
      return null;
    },
  };

  fastify.decorate("quoteService", mockQuoteService as any);
});

describe("Quote Routes - Version Integration", () => {
  let app: FastifyInstance;

  before(async () => {
    app = Fastify({ logger: false });

    // Register shared schemas first
    app.addSchema(ErrorSchema);
    app.addSchema(QuoteSchema);

    // Register plugins
    await app.register(versionResolverPlugin);
    await app.register(mockQuoteServicePlugin);

    // Register routes with all version patterns
    const versionPrefixes = app.getVersionPrefixes();
    for (const versionPrefix of versionPrefixes) {
      const prefix = versionPrefix ? `/${versionPrefix}/quotes` : "/quotes";
      await app.register(quoteRoutes, { prefix });
    }

    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  describe("Version Access Patterns", () => {
    it("should respond on exact version endpoint", async () => {
      const version = app.versionConfig.current.full;
      const response = await app.inject({
        method: "GET",
        url: `/v${version}/quotes/AAPL`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.symbol, "AAPL");
    });

    it("should respond on major version endpoint", async () => {
      const majorVersion = app.versionConfig.current.major;
      const response = await app.inject({
        method: "GET",
        url: `/v${majorVersion}/quotes/AAPL`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.symbol, "AAPL");
    });

    it("should respond on default (no version) endpoint", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/quotes/AAPL",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.symbol, "AAPL");
    });

    it("should return identical responses across all version patterns", async () => {
      const version = app.versionConfig.current.full;
      const majorVersion = app.versionConfig.current.major;

      const [exactResponse, majorResponse, defaultResponse] = await Promise.all(
        [
          app.inject({ method: "GET", url: `/v${version}/quotes/AAPL` }),
          app.inject({ method: "GET", url: `/v${majorVersion}/quotes/AAPL` }),
          app.inject({ method: "GET", url: "/quotes/AAPL" }),
        ],
      );

      assert.strictEqual(exactResponse.statusCode, 200);
      assert.strictEqual(majorResponse.statusCode, 200);
      assert.strictEqual(defaultResponse.statusCode, 200);

      const exactBody = JSON.parse(exactResponse.body);
      const majorBody = JSON.parse(majorResponse.body);
      const defaultBody = JSON.parse(defaultResponse.body);

      // All should have the same structure and symbol
      assert.strictEqual(exactBody.symbol, majorBody.symbol);
      assert.strictEqual(majorBody.symbol, defaultBody.symbol);
      assert.strictEqual(exactBody.symbol, "AAPL");
    });
  });

  describe("Error Handling Across Versions", () => {
    it("should return 404 for invalid symbol on all endpoints", async () => {
      const version = app.versionConfig.current.full;
      const majorVersion = app.versionConfig.current.major;

      const [exactResponse, majorResponse, defaultResponse] = await Promise.all(
        [
          app.inject({ method: "GET", url: `/v${version}/quotes/INVALID` }),
          app.inject({
            method: "GET",
            url: `/v${majorVersion}/quotes/INVALID`,
          }),
          app.inject({ method: "GET", url: "/quotes/INVALID" }),
        ],
      );

      // All should return the same error status
      assert.strictEqual(exactResponse.statusCode, majorResponse.statusCode);
      assert.strictEqual(majorResponse.statusCode, defaultResponse.statusCode);
    });
  });
});
