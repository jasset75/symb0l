# Symb0l API

API Service for Symb0l ecosystem.

## Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Modular structure and separation of concerns

## Usage

```bash
pnpm dev
```

## API Versioning

The API follows **Semantic Versioning** and supports multiple versions simultaneously.

### Versioning Strategy

- **URL Structure**: `/v<major>.<minor>.<patch>/<resource>` (e.g., `/v0.2.0/quotes/AAPL`)
- **Aliases**: Shortcuts like `/v0` point to the latest stable version (e.g., `/v0/quotes` -> `/v0.2.0/quotes`).
- **Default**: omitting the version prefix (e.g., `/quotes`) routes to the current **stable** version.

### Response Headers

Every API response includes versioning information:

- `X-Resolved-Version`: The exact version serving the request (e.g., `0.2.0`).
- `X-API-Stable-Version`: The current stable version of the API.

### Deprecation & Sunsetting

We use standard HTTP headers to communicate lifecycle changes:

- **Deprecated Versions**:
  - `Deprecation`: Date when the version was deprecated (RFC 7231).
  - `Sunset`: Date when the version will be removed (RFC 8594).
  - `Link`: Points to the successor version with `rel="successor-version"`.

- **Sunsetted Versions**:
  - Requests to a sunsetted version return **410 Gone**.
  - The body includes a message indicating the version is no longer available and points to the stable version.

## Health Check

- `GET /health`: Returns the service health status and current version.
