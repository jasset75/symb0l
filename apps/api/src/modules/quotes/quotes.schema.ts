import { Type, Static } from "@sinclair/typebox";
import { StandardErrorResponses } from "../../schemas/common.js";

// Quote Schema
export const QuoteSchema = Type.Object(
  {
    symbol: Type.String({ description: "Symbol ticker (e.g. AAPL)" }),
    price: Type.Number({ description: "Current price" }),
    currency: Type.String({ description: "Currency code (e.g. USD)" }),
    timestamp: Type.String({
      format: "date-time",
      description: "Quote timestamp",
    }),
  },
  { $id: "Quote" },
);

export type QuoteType = Static<typeof QuoteSchema>;

// Request Params Schema
export const QuoteParamsSchema = Type.Object({
  symbol: Type.String({
    description: "Symbol ticker (e.g. AAPL)",
    pattern: "^[A-Z0-9:.-]+$",
    maxLength: 20,
  }),
});

export type QuoteParamsType = Static<typeof QuoteParamsSchema>;

// Complete Route Schema
export const GetQuoteRouteSchema = {
  description: "Get a stock quote by symbol",
  tags: ["quotes"],
  params: QuoteParamsSchema,
  response: {
    200: {
      description: "Successful response",
      ...Type.Ref("Quote"),
    },
    ...StandardErrorResponses,
  },
} as const;
