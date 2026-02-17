import { Type, Static } from "@sinclair/typebox";
import {
  StandardErrorResponses,
  QuoteSchemaBase,
} from "../../schemas/common.js";

// Quote Schema imported from common.js
export { QuoteSchema } from "../../schemas/common.js";
export type { QuoteType } from "../../schemas/common.js";

// Request Params Schema
export const QuoteParamsSchema = Type.Object({
  symbol: Type.String({
    description: "Symbol ticker (e.g. AAPL)",
    pattern: "^[A-Z0-9:.-]+$",
    maxLength: 20,
  }),
});

export type QuoteParamsType = Static<typeof QuoteParamsSchema>;

// Request Query Schema for Batch
export const QuoteQuerySchema = Type.Object({
  symbols: Type.String({
    description: "Comma-separated list of symbols (e.g. AAPL,MSFT)",
    pattern: "^[A-Z0-9:.,-]+$",
  }),
});

export type QuoteQueryType = Static<typeof QuoteQuerySchema>;

// Complete Route Schema
export const GetQuoteRouteSchema = {
  description: "Get a stock quote by symbol",
  tags: ["quotes"],
  params: QuoteParamsSchema,
  response: {
    200: {
      description: "Successful response",
      ...QuoteSchemaBase,
    },
    ...StandardErrorResponses,
  },
} as const;

export const GetBatchQuotesRouteSchema = {
  description: "Get multiple stock quotes by symbols",
  tags: ["quotes"],
  querystring: QuoteQuerySchema,
  response: {
    200: {
      description: "Successful response",
      type: "array",
      items: QuoteSchemaBase,
    },
    ...StandardErrorResponses,
  },
} as const;
