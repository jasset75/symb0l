import { describe, it } from "node:test";
import assert from "node:assert";
import { QuoteService } from "./quote-service.js";
import { MarketDataProvider } from "../interfaces/market-data-provider.js";
import { ListingRepository } from "@symb0l/core";

describe("QuoteService provider symbol mapping", () => {
  it("should resolve canonical symbol to provider symbol for getQuote", async () => {
    const providerCalls: string[] = [];
    const provider = {
      getQuote: async (symbol: string) => {
        providerCalls.push(symbol);
        return {
          symbol,
          price: 1.08,
          currency: "USD",
          timestamp: new Date().toISOString(),
        };
      },
      getQuotes: async () => [],
    } as unknown as MarketDataProvider;

    const listingRepo = {
      validateSymbols: async () => ["EURUSD"],
      getProviderSymbols: async () => new Map([["EURUSD", "EUR/USD"]]),
      getCanonicalSymbols: async () => new Map<string, string>(),
    } as unknown as ListingRepository;

    const service = new QuoteService(provider, listingRepo, "twelve");
    const quote = await service.getQuote("EURUSD");

    assert.ok(quote);
    assert.strictEqual(providerCalls[0], "EUR/USD");
    assert.strictEqual(quote?.symbol, "EURUSD");
  });

  it("should normalize provider symbols back to canonical symbols for getQuotes", async () => {
    const providerSymbolsReceived: string[][] = [];
    const provider = {
      getQuote: async () => null,
      getQuotes: async (symbols: string[]) => {
        providerSymbolsReceived.push(symbols);
        return symbols.map((symbol) => ({
          symbol,
          price: 100,
          currency: "USD",
          timestamp: new Date().toISOString(),
        }));
      },
    } as unknown as MarketDataProvider;

    const listingRepo = {
      validateSymbols: async () => ["AAPL", "EURUSD"],
      getProviderSymbols: async () => new Map([
        ["AAPL", "AAPL"],
        ["EURUSD", "EUR/USD"],
      ]),
      getCanonicalSymbols: async () => new Map([["EUR/USD", "EURUSD"]]),
    } as unknown as ListingRepository;

    const service = new QuoteService(provider, listingRepo, "twelve");
    const quotes = await service.getQuotes(["AAPL", "EURUSD"]);

    assert.deepStrictEqual(providerSymbolsReceived[0], ["AAPL", "EUR/USD"]);
    assert.strictEqual(quotes[0].symbol, "AAPL");
    assert.strictEqual(quotes[1].symbol, "EURUSD");
  });
});
