import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  ErrorSchema,
  QuoteSchema,
  QuoteResultSchema,
} from "./schemas/common.js";
import { ListingSchema } from "./modules/listings/listings.schema.js";
import { join } from "path";
import { fileURLToPath } from "url";
import autoload from "@fastify/autoload";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register shared schemas (must be synchronous before plugins)
  fastify.addSchema(ErrorSchema);
  fastify.addSchema(QuoteSchema);
  fastify.addSchema(QuoteResultSchema);
  fastify.addSchema(ListingSchema);

  // Autoload all plugins in the plugins directory
  // Fastify will use the `dependencies` array in each fp() plugin to resolve the correct initialization order
  // (e.g. swagger depends on version-resolver, routes depend on DI, etc.)
  await fastify.register(autoload, {
    dir: join(__dirname, "plugins"),
  });

  return fastify;
}
