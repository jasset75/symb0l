import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import Fastify, { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sensible from "@fastify/sensible";
import { quoteRoutes } from "./index.js"; // or wherever routes are exported
import { ErrorSchema, QuoteSchema } from "../../schemas/common.js";
import { QuoteService } from "../../domain/services/quote-service.js"; // Import real service
import { MarketDataProvider } from "../../domain/interfaces/market-data-provider.js";
import { ListingRepository } from "@symb0l/core";

// Mock provider and repo
const mockDependenciesPlugin = fp(async (fastify) => {
  const mockProvider = {
    getQuote: async (symbol: string) => ({
      symbol,
      price: 150.0,
      currency: "USD",
      timestamp: new Date().toISOString(),
    }),
    getQuotes: async (symbols: string[]) =>
      symbols.map((s) => ({
        symbol: s,
        price: 150.0,
        currency: "USD",
        timestamp: new Date().toISOString(),
      })),
  };

  const mockListingRepo = {
    validateSymbols: async (symbols: string[]) => {
      // Simulate that "INVALID" and "MISSING" are not in DB
      return symbols.filter((s) => s !== "INVALID" && s !== "MISSING");
    },
    getProviderSymbols: async (symbols: string[]) => {
      const mapping = new Map<string, string>();
      symbols.forEach((symbol) => mapping.set(symbol, symbol));
      return mapping;
    },
    getCanonicalSymbols: async (providerSymbols: string[]) => {
      const mapping = new Map<string, string>();
      providerSymbols.forEach((symbol) => mapping.set(symbol, symbol));
      return mapping;
    },
  };

  const service = new QuoteService(
    mockProvider as unknown as MarketDataProvider,
    mockListingRepo as unknown as ListingRepository,
  );
  fastify.decorate("quoteService", service);
});

describe("Quote Batch Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    app.addSchema(ErrorSchema);
    app.addSchema(QuoteSchema);

    await app.register(sensible);
    await app.register(mockDependenciesPlugin);
    await app.register(quoteRoutes, { prefix: "/quotes" });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return batch quotes for valid symbols", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/quotes?symbols=AAPL,MSFT",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(Array.isArray(body), true);
    assert.strictEqual(body.length, 2);
    assert.strictEqual(body[0].symbol, "AAPL");
    assert.strictEqual(body[1].symbol, "MSFT");
  });

  it("should return single quote for single symbol in batch param", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/quotes?symbols=AAPL",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(Array.isArray(body), true);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].symbol, "AAPL");
  });

  it("should return 404 if one symbol is invalid (mixed batch)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/quotes?symbols=AAPL,INVALID",
    });

    assert.strictEqual(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.match(body.message, /Symbols not found/);
    assert.match(body.message, /INVALID/);
  });

  it("should return 404 if all symbols are invalid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/quotes?symbols=INVALID,MISSING",
    });

    assert.strictEqual(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.match(body.message, /Symbols not found/);
  });

  it("should return 400 if symbols param is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/quotes?symbols=",
    });

    assert.strictEqual(response.statusCode, 400); // Bad Request from handler check
  });

  describe("Single Quote Route (Legacy)", () => {
    it("should return 200 for valid symbol", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/quotes/AAPL",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.symbol, "AAPL");
    });

    it("should return 404 for invalid symbol", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/quotes/INVALID",
      });

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.match(body.message, /Quote not found/);
    });
  });
});
