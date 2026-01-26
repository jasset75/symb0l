import { initDb } from "./db.js";
import { seedDatabase } from "./seeds/index.js";

console.log("Starting Symb0l...");
initDb();

// Check if --seed flag is present
const shouldSeed = process.argv.includes("--seed");

if (shouldSeed) {
  console.log("Seed flag detected, running seeds...");
  seedDatabase();
}

console.log("Symb0l started.");
