import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getListings } from "./listings.handler.js";
import { GetListingsRouteSchema } from "./listings.schema.js";

export const listingsRoutes: FastifyPluginAsyncTypebox<{
  hideFromSwagger?: boolean;
}> = async (fastify, opts) => {
  fastify.get(
    "/",
    {
      schema: {
        ...GetListingsRouteSchema,
        hide: opts.hideFromSwagger,
      },
    },
    getListings,
  );
};
