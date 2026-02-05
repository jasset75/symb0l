import { initDb } from "@symb0l/core";
// import Fastify from 'fastify';

console.log("Starting API Service...");

try {
  initDb();
  console.log("Database initialized from Core.");
} catch (err) {
  console.error("Failed to init DB:", err);
}

// TODO: Setup Fastify
console.log("API setup pending...");
