import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  GetQuoteRouteSchema,
  GetBatchQuotesRouteSchema,
} from "./quotes.schema.js";
import { getQuote, getQuotesBatch } from "./quotes.handler.js";

/**
 * Quote routes plugin
 * Provides stock quote endpoints
 */
export async function quoteRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & { hideFromSwagger?: boolean },
) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        ...GetBatchQuotesRouteSchema,
        hide: opts.hideFromSwagger,
      },
    },
    getQuotesBatch,
  );

  server.get(
    "/:symbol",
    {
      schema: {
        ...GetQuoteRouteSchema,
        hide: opts.hideFromSwagger,
      },
    },
    getQuote,
  );
}
