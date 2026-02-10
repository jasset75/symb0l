import { Type, Static } from "@sinclair/typebox";

// Common properties
export const CommonHealthProps = {
  status: Type.String(),
};

// V1 Schema (0.1.0)
export const HealthV1Schema = Type.Object({
  ...CommonHealthProps,
  service: Type.String(),
  version: Type.String(),
  stableVersion: Type.String(),
  supportedVersions: Type.Array(Type.String()),
  deprecatedVersions: Type.Record(
    Type.String(),
    Type.Object({
      sunset: Type.Optional(Type.String()),
    }),
  ),
  timestamp: Type.String(),
});

export type HealthV1Type = Static<typeof HealthV1Schema>;

// V2 Schema (0.2.0)
export const HealthV2Schema = Type.Object({
  ...CommonHealthProps,
  api: Type.Object({
    name: Type.String(),
    version: Type.String(),
  }),
  versions: Type.Object({
    stable: Type.String(),
    supported: Type.Array(Type.String()),
    deprecated: Type.Array(Type.String()),
    sunsetted: Type.Array(Type.String()),
  }),
  timestamp: Type.String(),
  uptime: Type.Number(),
});

export type HealthV2Type = Static<typeof HealthV2Schema>;

// Route Schemas
export const HealthV1RouteSchema = {
  description: "Health check endpoint",
  tags: ["health"],
  response: {
    200: HealthV1Schema,
  },
} as const;

export const HealthV2RouteSchema = {
  description: "Health check endpoint",
  tags: ["health"],
  response: {
    200: HealthV2Schema,
  },
} as const;
