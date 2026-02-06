export const ErrorSchema = {
  $id: "Error",
  type: "object",
  properties: {
    statusCode: { type: "number" },
    error: { type: "string" },
    message: { type: "string" },
  },
  required: ["statusCode", "error", "message"],
};

export const QuoteSchema = {
  $id: "Quote",
  type: "object",
  properties: {
    symbol: { type: "string", description: "Symbol ticker (e.g. AAPL)" },
    price: { type: "number", description: "Current price" },
    currency: { type: "string", description: "Currency code (e.g. USD)" },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Quote timestamp",
    },
  },
  required: ["symbol", "price", "currency", "timestamp"],
};
