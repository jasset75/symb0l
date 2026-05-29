# Roadmap

This document outlines the planned features, architectural improvements, and upcoming milestones for the Symb0l project.

### Core / API
- **Dynamic Filter Endpoints**: Implement `GET /v0/sectors` and `GET /v0/profiles` in the Fastify API.
- **Quote Provider Aggregator**: Introduce a multi-provider strategy for real-time market data (e.g., TwelveData, Yahoo Finance, AlphaVantage). 
  - *Capability Routing*: Route requests intelligently so capable providers handle complex queries (e.g., historical OHLCV) while cheap/free providers handle high-volume plain price fetching.
  - *Algorithmic Orchestration*: Implement classical heuristics (State Machines, Circuit Breakers, and Weighted Routers) to deterministically handle rate limits and fast fallbacks without adding runtime latency.
  - *Graceful Degradation*: Define a common rich metadata template for quotes. If a data point (like `average_volume` or `fifty_two_week_high`) isn't supplied by the current fallback provider, the API should return it explicitly as `not-provided` rather than failing the entire request.
  - *AI Quota & Quality Intelligence (Worker)*: An asynchronous background agent that periodically analyzes provider error rates, latency, and symbol coverage to generate optimization reports (e.g., recommending tier upgrades or identifying underperforming providers).

### TUI (Terminal User Interface)
- **Pagination**: Support iterating through pages of listings if the API implements limits/pagination.
- **Detailed View**: A modal or full-screen view for a single symbol showing extended metadata and historical quotes.

## Medium Term
- **Data Ingestion pipelines**: Automated workers to periodically update the SQLite database with new symbols from configured upstream sources.
- **Advanced Filtering**: Support sorting by price change, market cap, and filtering by country exposure.

## Long Term
- **Portfolio Tracking**: Features to track user portfolio, calculate risk exposure, and simulate wash sales entirely within the terminal.
