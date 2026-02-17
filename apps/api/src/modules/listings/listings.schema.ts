import { Type, Static } from "@sinclair/typebox";
import {
  StandardErrorResponses,
  QuoteSchema,
  QuoteResultSchema,
} from "../../schemas/common.js";

// Listing Schema (matches view_listings)
export const ListingSchema = Type.Object(
  {
    symbol_code: Type.String(),
    instrument_name: Type.String(),
    instrument_type: Type.String(),
    isin: Type.String(),
    profile: Type.String(),
    risk_level: Type.String(),
    asset_class_level: Type.String(),
    market_cap: Type.String(),
    sector: Type.String(),
    sub_industry: Type.String(),
    country_exposure: Type.String(),
    market_name: Type.String(),
    market_mic: Type.String(),
    market_timezone: Type.String(),
    country_code: Type.String(),
    country_name: Type.String(),
    currency_code: Type.String(),
    currency_symbol: Type.String(),
    // Optional quote included
    quote: Type.Optional(QuoteResultSchema),
  },
  { $id: "Listing" },
);

export type ListingType = Static<typeof ListingSchema>;

// Query Schema
const CommaSeparatedStringOrArray = Type.Union([
  Type.String(),
  Type.Array(Type.String()),
]);

export const ListingQuerySchema = Type.Object({
  // Whitelisted filters
  symbol_code: Type.Optional(CommaSeparatedStringOrArray),
  instrument_type: Type.Optional(CommaSeparatedStringOrArray),
  isin: Type.Optional(CommaSeparatedStringOrArray),
  profile: Type.Optional(CommaSeparatedStringOrArray),
  risk_level: Type.Optional(CommaSeparatedStringOrArray),
  asset_class_level: Type.Optional(CommaSeparatedStringOrArray),
  market_cap: Type.Optional(CommaSeparatedStringOrArray),
  sector: Type.Optional(CommaSeparatedStringOrArray),
  sub_industry: Type.Optional(CommaSeparatedStringOrArray),
  country_exposure: Type.Optional(CommaSeparatedStringOrArray),
  country_code: Type.Optional(CommaSeparatedStringOrArray),
  currency_code: Type.Optional(CommaSeparatedStringOrArray),

  // Single value filters
  instrument_name: Type.Optional(Type.String({ description: "Partial match" })),

  // Options
  include_quote: Type.Optional(Type.Boolean()),

  // Pagination
  page: Type.Optional(Type.Number({ default: 1, minimum: 1 })),
  limit: Type.Optional(Type.Number({ default: 50, maximum: 100, minimum: 1 })),
});

export type ListingQueryType = Static<typeof ListingQuerySchema>;

// Route Schema
export const GetListingsRouteSchema = {
  description: "Get listings with optional filtering and quotes",
  tags: ["listings"],
  querystring: ListingQuerySchema,
  response: {
    200: {
      description: "Successful response",
      type: "array",
      items: ListingSchema,
    },
    ...StandardErrorResponses,
  },
} as const;
