import { describe, it } from "node:test";
import assert from "node:assert";

describe("Application Entry Point", () => {
  it("should initialize database on startup", async () => {
    // Mock console.log to capture output
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleLogs.push(args.join(" "));
    };

    // Import and run the module
    // Note: This will actually execute the code, so we need to be careful
    // For a more isolated test, we would refactor index.ts to export a main function
    await import("./cli.js");

    // Restore console.log
    console.log = originalLog;

    // Verify expected console output
    assert.ok(
      consoleLogs.some((log) => log.includes("Starting Symb0l")),
      'Should log "Starting Symb0l"'
    );
    assert.ok(
      consoleLogs.some((log) => log.includes("Database initialized")),
      'Should log "Database initialized"'
    );
    assert.ok(
      consoleLogs.some((log) => log.includes("Symb0l started")),
      'Should log "Symb0l started"'
    );
  });
});
