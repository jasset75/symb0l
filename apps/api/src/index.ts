import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import { quoteRoutes } from "./routes/quotes.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true, // Allow all origins for now
});

// Register routes
await fastify.register(quoteRoutes, { prefix: "/quotes" });

fastify.get("/", async (request, reply) => {
  return { hello: "world", service: "Symb0l API" };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
