import { FastifyInstance } from "fastify";
import { twelveData } from "../services/twelvedata.js";
import { db } from "@symb0l/core";

export async function quoteRoutes(fastify: FastifyInstance) {
  fastify.get("/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };

    if (!symbol) {
      return reply.code(400).send({ error: "Symbol is required" });
    }

    try {
      // TODO: Future improvement - Enrich quote with metadata from local DB
      // We could look up by symbol_code in listing or isin in instrument to add sector, market, etc.
      // Consideration: Verify performance impact before implementing.

      const quote = await twelveData.getQuote(symbol);

      return {
        symbol: quote.symbol,
        price: parseFloat(quote.close),
        currency: quote.currency,
        timestamp: new Date(quote.timestamp * 1000).toISOString(),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch quote" });
    }
  });
}
