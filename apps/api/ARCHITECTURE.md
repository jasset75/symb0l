# API Architecture

## Overview

This API follows a **modular architecture** with strict **separation of concerns** to improve maintainability, testability, and scalability.

## Core Principles

### Separation of Concerns

Each module is divided into three distinct layers:

1. **Schemas** (`*.schema.ts`) - Data structure definitions
2. **Handlers** (`*.handler.ts`) - Business logic and request handling
3. **Routes** (`*.routes.ts`) - HTTP routing and schema wiring

### No Cross-Layer Dependencies

- **Schemas** must not import Fastify or handlers
- **Handlers** must not import routes
- **Routes** only wire schemas and handlers together

---

## Directory Structure

```
src/
├── app.ts                    # Fastify instance setup
├── server.ts                 # Entry point (starts server)
├── modules/                  # Feature modules
│   ├── health/
│   │   ├── health.schema.ts  # TypeBox schemas + route schemas
│   │   ├── health.handler.ts # Request handlers
│   │   ├── health.routes.ts  # Route registration
│   │   └── index.ts          # Module exports
│   └── quotes/
│       ├── quotes.schema.ts  # TypeBox schemas + route schemas
│       ├── quotes.handler.ts # Request handlers
│       ├── quotes.routes.ts  # Route registration
│       └── index.ts          # Module exports
├── plugins/                  # Fastify plugins
├── schemas/                  # Shared schemas
└── services/                 # Business services
```

---

## Module Anatomy

### Schema Layer (`*.schema.ts`)

**Purpose**: Define all data structures and route schemas

**Responsibilities**:

- TypeBox schema definitions
- Type exports via `Static<>`
- Complete route schema objects (params, response, description, tags)

**Example**:

```typescript
// Data schema
export const QuoteSchema = Type.Object({
  symbol: Type.String(),
  price: Type.Number(),
  // ...
});

export type QuoteType = Static<typeof QuoteSchema>;

// Route schema
export const GetQuoteRouteSchema = {
  description: "Get a stock quote by symbol",
  tags: ["quotes"],
  params: QuoteParamsSchema,
  response: {
    200: { ...Type.Ref("Quote") },
    ...StandardErrorResponses,
  },
} as const;
```

**Rules**:

- ✅ Import from `@sinclair/typebox`
- ✅ Import shared schemas from `schemas/common.ts`
- ❌ No Fastify imports
- ❌ No handler imports

---

### Handler Layer (`*.handler.ts`)

**Purpose**: Implement business logic and request handling

**Responsibilities**:

- Extract and validate request data
- Call services/external APIs
- Handle errors
- Return typed responses

**Example**:

```typescript
export async function getQuote(
  request: FastifyRequest<{ Params: QuoteParamsType }>,
  reply: FastifyReply,
): Promise<QuoteType> {
  const { symbol } = request.params;

  const quote = await request.server.quoteService.getQuote(symbol);

  if (!quote) {
    return reply.notFound(`Quote not found: ${symbol}`);
  }

  return quote;
}
```

**Rules**:

- ✅ Import types from schema layer
- ✅ Use Fastify helpers (`reply.notFound()`, etc.)
- ✅ Proper TypeScript typing
- ❌ No inline schemas
- ❌ No route registration

---

### Route Layer (`*.routes.ts`)

**Purpose**: Wire schemas and handlers to HTTP endpoints

**Responsibilities**:

- Register routes with Fastify
- Connect route schemas to handlers
- Handle route-level configuration (versioning, Swagger visibility)

**Example**:

```typescript
export async function quoteRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & { hideFromSwagger?: boolean },
) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

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
```

**Rules**:

- ✅ Import route schemas from schema layer
- ✅ Import handlers from handler layer
- ✅ Minimal logic (only wiring)
- ❌ No inline schemas
- ❌ No business logic

---

## Version Management

### Version Configuration Pattern

Actual configuration is separated into three files for maintainability:

1. **Data** (`api-version.data.ts`): Single source of truth, contains only data.
2. **Schema** (`api-version.schema.ts`): TypeBox definitions.
3. **Logic** (`api-version.config.ts`): Validation and export.

```typescript
// api-version.data.ts
export const API_VERSION_DATA = {
  stable: "0.2.0",
  aliases: { v0: "0.2.0" },
  supported: ["0.1.0", "0.2.0"],
  // ...
} as const;
```

**Benefits**:

- **Separation of Concerns**: Data is isolated from logic.
- **Type Safety**: Full TypeScript validation at compile time.
- **Runtime Validation**: Config is validated against schema on load.
- **Maintainability**: Easy to update versions without touching code.

### Swagger Visibility

Only the **canonical version** appears in Swagger documentation:

```typescript
server.get(
  "/",
  {
    schema: {
      ...config.routeSchema,
      hide: opts.hideFromSwagger, // Set by versioned-routes plugin
    },
  },
  config.handler,
);
```

---

## Adding a New Endpoint

### 1. Create Schema File

```typescript
// src/modules/example/example.schema.ts
import { Type, Static } from "@sinclair/typebox";

export const ExampleSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
});

export type ExampleType = Static<typeof ExampleSchema>;

export const GetExampleRouteSchema = {
  description: "Get example by ID",
  tags: ["example"],
  params: Type.Object({ id: Type.String() }),
  response: {
    200: ExampleSchema,
    ...StandardErrorResponses,
  },
} as const;
```

### 2. Create Handler File

```typescript
// src/modules/example/example.handler.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { ExampleType } from "./example.schema.js";

export async function getExample(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<ExampleType> {
  // Business logic here
  return { id: request.params.id, name: "Example" };
}
```

### 3. Create Routes File

```typescript
// src/modules/example/example.routes.ts
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { GetExampleRouteSchema } from "./example.schema.js";
import { getExample } from "./example.handler.js";

export async function exampleRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & { hideFromSwagger?: boolean },
) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/:id",
    {
      schema: {
        ...GetExampleRouteSchema,
        hide: opts.hideFromSwagger,
      },
    },
    getExample,
  );
}
```

### 4. Create Index File

```typescript
// src/modules/example/index.ts
export { exampleRoutes } from "./example.routes.js";
export * from "./example.schema.js";
export * from "./example.handler.js";
```

### 5. Register in App

```typescript
// src/app.ts
import { exampleRoutes } from "./modules/example/index.js";

await fastify.register(registerVersionedRoutes, {
  basePath: "/example",
  routePlugin: exampleRoutes,
});
```

---

## Benefits of This Architecture

### Maintainability

- Clear file organization
- Easy to locate code
- Predictable structure

### Testability

- Handlers can be tested in isolation
- Schemas can be validated independently
- Routes can be integration tested

### Scalability

- Add new endpoints without touching existing code
- Version management through configuration
- No code duplication

### Type Safety

- Full TypeScript coverage
- Schema-driven types via `Static<>`
- Compile-time validation

### Documentation

- Swagger auto-generated from schemas
- Self-documenting route schemas
- Clear separation of concerns
