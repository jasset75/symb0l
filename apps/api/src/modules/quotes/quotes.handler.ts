import { FastifyRequest, FastifyReply } from "fastify";
import { QuoteParamsType, QuoteType } from "./quotes.schema.js";

export async function getQuote(
  request: FastifyRequest<{ Params: QuoteParamsType }>,
  reply: FastifyReply,
): Promise<QuoteType> {
  const { symbol } = request.params;

  // Manual validation not strictly needed if schema validation is on,
  // but good to keep or relying purely on fastify schema
  if (!symbol) {
    return reply.badRequest("Symbol is required");
  }

  try {
    // TODO: Future improvement - Enrich quote with metadata from local DB
    // We could look up by symbol_code in listing or isin in instrument to add sector, market, etc.
    // Consideration: Verify performance impact before implementing.

    const quote = await request.server.quoteService.getQuote(symbol);

    if (!quote) {
      return reply.notFound(`Quote not found for symbol: ${symbol}`);
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
    return reply.badGateway("Failed to fetch quote from upstream provider");
  }
}
