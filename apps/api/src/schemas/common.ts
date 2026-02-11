import { Type, Static } from "@sinclair/typebox";

export const ErrorSchema = Type.Object(
  {
    statusCode: Type.Number(),
    error: Type.String(),
    message: Type.String(),
  },
  { $id: "Error" },
);

export type ErrorType = Static<typeof ErrorSchema>;

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

export const StandardErrorResponses = {
  400: {
    description: "Bad Request",
    ...Type.Ref("Error"),
  },
  401: {
    description: "Unauthorized",
    ...Type.Ref("Error"),
  },
  403: {
    description: "Forbidden",
    ...Type.Ref("Error"),
  },
  404: {
    description: "Not Found",
    ...Type.Ref("Error"),
  },
  500: {
    description: "Internal Server Error",
    ...Type.Ref("Error"),
  },
  502: {
    description: "Bad Gateway",
    ...Type.Ref(ErrorSchema),
  },
  503: {
    description: "Service Unavailable",
    ...Type.Ref(ErrorSchema),
  },
};
