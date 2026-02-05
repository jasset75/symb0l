# Testing Guide

## Test Structure

This project follows a clear separation between unit tests and integration tests:

### Naming Conventions

- **Unit Tests**: `*.test.ts` - Fast, isolated tests that don't require external resources
- **Integration Tests**: `*.integration.test.ts` - Tests that interact with databases, file systems, or external services

### Test Scripts

```bash
# Run unit tests only (fast)
pnpm test

# Run integration tests only (slower)
pnpm test:integration

# Run all tests
pnpm test:all

# Watch mode for unit tests
pnpm test:watch

# Coverage report for unit tests
pnpm test:coverage
```

## Git Hooks

### Pre-commit

- Linting
- Formatting
- Type checking
- Diagram compilation

### Pre-push

- **Integration tests** - Ensures data integrity before pushing

## Test Organization

Tests are co-located with the code they test:

```
src/
  db.ts
  db.test.ts                    # Unit tests for db.ts
  seeds/
    currencies.ts
    index.ts
    currencies.integration.test.ts  # Integration tests for currency seeds
```

## Writing Tests

### Unit Tests Example

```typescript
// example.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";

describe("Example Unit Tests", () => {
  it("should do something", () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### Integration Tests Example

```typescript
// example.integration.test.ts
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";

describe("Example Integration Tests", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    // Setup
  });

  afterEach(() => {
    db.close();
    // Cleanup
  });

  it("should interact with database", () => {
    // Test with real database
  });
});
```

## Best Practices

1. **Keep unit tests fast** - No I/O, no external dependencies
2. **Integration tests should be isolated** - Use unique test databases
3. **Clean up resources** - Always close connections and delete test files
4. **Use descriptive test names** - Clearly state what is being tested
5. **One assertion per test** - Makes failures easier to diagnose
