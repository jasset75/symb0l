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

export const StandardErrorResponses = {
  400: {
    description: "Bad Request",
    $ref: "Error#",
  },
  401: {
    description: "Unauthorized",
    $ref: "Error#",
  },
  403: {
    description: "Forbidden",
    $ref: "Error#",
  },
  404: {
    description: "Not Found",
    $ref: "Error#",
  },
  500: {
    description: "Internal Server Error",
    $ref: "Error#",
  },
  502: {
    description: "Bad Gateway",
    $ref: "Error#",
  },
  503: {
    description: "Service Unavailable",
    $ref: "Error#",
  },
};
