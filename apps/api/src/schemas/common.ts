import { Type, Static } from "@sinclair/typebox";

export const ErrorSchemaBase = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
});

export const ErrorSchema = Type.Object(ErrorSchemaBase.properties, {
  $id: "Error",
});

export type ErrorType = Static<typeof ErrorSchema>;

export const QuoteSchemaBase = Type.Object({
  symbol: Type.String({ description: "Symbol ticker (e.g. AAPL)" }),
  price: Type.Number({ description: "Current price" }),
  currency: Type.String({ description: "Currency code (e.g. USD)" }),
  timestamp: Type.String({
    format: "date-time",
    description: "Quote timestamp",
  }),
});

export const QuoteSchema = Type.Object(QuoteSchemaBase.properties, {
  $id: "Quote",
});

export type QuoteType = Static<typeof QuoteSchema>;

export const QuoteStatus = Type.Union([
  Type.Literal("success"),
  Type.Literal("error"),
  Type.Literal("not_found"), // For valid symbol but no market data
]);

export const QuoteResultSchema = Type.Object(
  {
    status: QuoteStatus,
    // Data is present if status is success (or stale)
    data: Type.Optional(QuoteSchemaBase),
    // Error is present if status is error
    error: Type.Optional(
      Type.Object({
        code: Type.String(),
        message: Type.String(),
      }),
    ),
  },
  { $id: "QuoteResult" },
);

export type QuoteResultType = Static<typeof QuoteResultSchema>;

export const StandardErrorResponses = {
  400: {
    description: "Bad Request",
    ...ErrorSchemaBase,
  },
  401: {
    description: "Unauthorized",
    ...ErrorSchemaBase,
  },
  403: {
    description: "Forbidden",
    ...ErrorSchemaBase,
  },
  404: {
    description: "Not Found",
    ...ErrorSchemaBase,
  },
  500: {
    description: "Internal Server Error",
    ...ErrorSchemaBase,
  },
  502: {
    description: "Bad Gateway",
    ...ErrorSchemaBase,
  },
  503: {
    description: "Service Unavailable",
    ...ErrorSchemaBase,
  },
};
