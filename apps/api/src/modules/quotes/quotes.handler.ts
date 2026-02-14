import { FastifyRequest, FastifyReply } from "fastify";
import { QuoteParamsType, QuoteType, QuoteQueryType } from "./quotes.schema.js";

export async function getQuote(
  request: FastifyRequest<{ Params: QuoteParamsType }>,
  reply: FastifyReply,
): Promise<QuoteType> {
  const { symbol } = request.params;

  if (!symbol) {
    return reply.badRequest("Symbol is required");
  }

  try {
    const quote = await request.server.quoteService.getQuote(symbol);

    if (!quote) {
      return reply.notFound(`Quote not found for symbol: ${symbol}`);
    }

    return quote;
  } catch (error: unknown) {
    request.log.error(error);
    if (error instanceof Error && error.message.includes("Symbols not found")) {
      return reply.notFound(error.message);
    }
    return reply.badGateway("Failed to fetch quote from upstream provider");
  }
}

export async function getQuotesBatch(
  request: FastifyRequest<{ Querystring: QuoteQueryType }>,
  reply: FastifyReply,
): Promise<QuoteType[]> {
  const { symbols } = request.query;

  if (!symbols) {
    return reply.badRequest("Symbols are required");
  }

  const symbolList = symbols
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbolList.length === 0) {
    return reply.badRequest("At least one symbol is required");
  }

  try {
    const quotes = await request.server.quoteService.getQuotes(symbolList);
    return quotes;
  } catch (error: unknown) {
    request.log.error(error);
    if (error instanceof Error && error.message.includes("Symbols not found")) {
      return reply.notFound(error.message);
    }
    return reply.badGateway("Failed to fetch quotes from upstream provider");
  }
}
