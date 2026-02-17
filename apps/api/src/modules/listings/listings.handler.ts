import { FastifyRequest, FastifyReply } from "fastify";
import { ListingQueryType } from "./listings.schema.js";

export async function getListings(
  request: FastifyRequest<{ Querystring: ListingQueryType }>,
  reply: FastifyReply,
): Promise<any> {
  const {
    page = 1,
    limit = 50,
    include_quote = false,
    ...filters
  } = request.query;

  // Convert comma-separated strings to arrays
  const parsedFilters: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (key === "instrument_name") {
      parsedFilters[key] = value; // Keep as string
    } else if (typeof value === "string" && value.includes(",")) {
      parsedFilters[key] = value.split(",").map((v) => v.trim());
    } else if (typeof value === "string") {
      parsedFilters[key] = [value]; // Wrap single value in array
    } else {
      parsedFilters[key] = value; // Already array or undefined
    }
  });

  const offset = (page - 1) * limit;

  try {
    const listings = await request.server.listingService.getListings(
      {
        filters: parsedFilters,
        limit,
        offset,
      },
      include_quote,
    );
    return listings;
  } catch (error) {
    request.log.error(error);
    return reply.internalServerError("Failed to fetch listings");
  }
}
