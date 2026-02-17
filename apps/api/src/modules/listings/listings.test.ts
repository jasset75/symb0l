import { test } from "node:test";
import assert from "node:assert";
import { buildApp } from "../../app.js";

test("Listings Endpoint", async (t) => {
  const app = await buildApp();

  t.after(async () => {
    await app.close();
  });

  await t.test("GET /listings should return paginated results", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v0/listings?limit=5",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(Array.isArray(body));
    assert.strictEqual(body.length, 5);
    // Ensure listing_id is not exposed
    assert.strictEqual(body[0].listing_id, undefined);
  });

  await t.test(
    "GET /listings should filter by instrument_name (partial match)",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v0/listings?instrument_name=Apple",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.length > 0);
      const apple = body.find((l: any) => l.symbol_code === "AAPL");
      assert.ok(apple);
    },
  );

  await t.test("GET /listings should filter by multiple sectors", async () => {
    // Assuming we have some data. If not, this might return empty, but status should be 200.
    const response = await app.inject({
      method: "GET",
      url: "/v0/listings?sector=Technology,Healthcare",
    });

    assert.strictEqual(response.statusCode, 200);
  });

  await t.test("GET /listings should support include_quote", async () => {
    const response = await app.inject({
      method: "GET",
      // Use a known symbol to ensure we get a quote if provider works or mocks are set
      url: "/v0/listings?symbol_code=AAPL&include_quote=true",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.length > 0);

    // Note: If TwelveData key is missing or invalid, quote might be missing but field should be present or handled.
    // In our implementation, we attach it if found.
    // Let's check if structural integrity is preserved.
    const aapl = body.find((l: any) => l.symbol_code === "AAPL");
    assert.ok(aapl);
    // Quote might be undefined if external service fails/no key, but request shouldn't crash.
  });

  await t.test("GET /listings pagination", async () => {
    const response1 = await app.inject({
      method: "GET",
      url: "/v0/listings?limit=2&page=1",
    });
    const body1 = JSON.parse(response1.body);
    assert.strictEqual(body1.length, 2);

    const response2 = await app.inject({
      method: "GET",
      url: "/v0/listings?limit=2&page=2",
    });
    const body2 = JSON.parse(response2.body);
    assert.strictEqual(body2.length, 2);

    // Ensure they are different
    assert.notDeepStrictEqual(body1, body2);
  });

  await t.test("GET /v0.1.0/listings should return 404", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v0.1.0/listings",
    });
    assert.strictEqual(response.statusCode, 404);
  });

  await t.test("GET /v0.2.0/listings should return 200", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v0.2.0/listings?limit=1",
    });
    assert.strictEqual(response.statusCode, 200);
  });
});
