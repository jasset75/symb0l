import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { ListingRepository } from "@symb0l/core";

declare module "fastify" {
  interface FastifyInstance {
    listingRepository: ListingRepository;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const listingRepository = new ListingRepository();

    fastify.decorate("listingRepository", listingRepository);
  },
  {
    name: "repository-plugin",
    fastify: "5.x",
  },
);
