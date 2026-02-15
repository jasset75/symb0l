import "dotenv/config";

import { buildApp } from "./app.js";

const start = async () => {
  try {
    const fastify = await buildApp();
    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
