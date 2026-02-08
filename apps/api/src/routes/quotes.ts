import { FastifyInstance, FastifyPluginOptions } from "fastify";

/**
 * Quote routes plugin
 * Provides stock quote endpoints
 */
export async function quoteRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.get(
    "/:symbol",
    {
      schema: {
        description: "Get a stock quote by symbol",
        tags: ["quotes"],
        params: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol ticker (e.g. AAPL)",
              pattern: "^[A-Z0-9:.-]+$",
              maxLength: 20,
            },
          },
          required: ["symbol"],
        },
        response: {
          200: {
            description: "Successful response",
            $ref: "Quote#",
          },
          400: {
            description: "Bad Request",
            $ref: "Error#",
          },
          404: {
            description: "Symbol Not Found",
            $ref: "Error#",
          },
          500: {
            description: "Internal Server Error",
            $ref: "Error#",
          },
          502: {
            description: "Bad Gateway (Upstream Error)",
            $ref: "Error#",
          },
        },
      },
    },
    async (request, reply) => {
      const { symbol } = request.params as { symbol: string };

      // Manual validation not strictly needed if schema validation is on,
      // but good to keep or relying purely on fastify schema
      if (!symbol) {
        // This is unreachable if required: ['symbol'] is set in params schema
        // and fastify handles it. But for safety:
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Symbol is required",
        });
      }

      try {
        // TODO: Future improvement - Enrich quote with metadata from local DB
        // We could look up by symbol_code in listing or isin in instrument to add sector, market, etc.
        // Consideration: Verify performance impact before implementing.

        const quote = await request.server.quoteService.getQuote(symbol);

        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: `Quote not found for symbol: ${symbol}`,
          });
        }

        // Check for specific API error payload from twelvedata if it returns 200 OK but with error msg
        // (Depends on twelvedata implementation, assuming standard response for now based on existing code)

        return {
          symbol: quote.symbol,
          price: quote.price,
          currency: quote.currency,
          timestamp: quote.timestamp,
        };
      } catch (error) {
        request.log.error(error);
        // Distinguish between different error types if possible
        return reply.code(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "Failed to fetch quote from upstream provider",
        });
      }
    },
  );
}
