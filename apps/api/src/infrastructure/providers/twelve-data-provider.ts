import {
  MarketDataProvider,
  Quote,
} from "../../domain/interfaces/market-data-provider.js";
import { FastifyBaseLogger } from "fastify";

const RATE_LIMIT_ERROR = "rate_limit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRateLimitPayload(payload: Record<string, unknown>): boolean {
  return payload.code === 429 || payload.code === "429";
}

function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === RATE_LIMIT_ERROR || error.message.includes("429"))
  );
}

function getMessage(payload: Record<string, unknown>): string {
  return typeof payload.message === "string" ? payload.message : "unknown error";
}

export class TwelveDataProvider implements MarketDataProvider {
  private baseUrl = "https://api.twelvedata.com";

  constructor(
    private apiKey: string,
    private readonly log?: FastifyBaseLogger,
    private readonly batchSize: number = 8,
  ) {}

  private resolveCurrency(
    symbol: string,
    payload: Record<string, unknown>,
  ): string {
    const directCurrency =
      (payload.currency as string | undefined) ||
      (payload.currency_quote as string | undefined) ||
      (payload.quote_currency as string | undefined);

    if (directCurrency && directCurrency.trim().length > 0) {
      return directCurrency;
    }

    // FX fallback: symbols like EUR/USD -> quote currency USD
    const slashSeparated = symbol.split("/");
    if (slashSeparated.length === 2 && slashSeparated[1]) {
      return slashSeparated[1].toUpperCase();
    }

    return "N/A";
  }

  private resolveTimestamp(payload: Record<string, unknown>): string {
    const rawTimestamp = payload.timestamp;

    if (typeof rawTimestamp === "number") {
      return new Date(rawTimestamp * 1000).toISOString();
    }

    if (typeof rawTimestamp === "string") {
      const asNumber = Number(rawTimestamp);
      if (Number.isFinite(asNumber)) {
        return new Date(asNumber * 1000).toISOString();
      }
    }

    return new Date().toISOString();
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      if (!this.apiKey) {
        throw new Error("API Key is missing");
      }

      const url = `${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) throw new Error(RATE_LIMIT_ERROR);
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const dataJson: unknown = await response.json();
      if (!isRecord(dataJson)) {
        throw new Error("Twelve Data API error: unexpected response format");
      }

      if (dataJson.code && dataJson.code !== 200) {
        if (isRateLimitPayload(dataJson)) throw new Error(RATE_LIMIT_ERROR);
        throw new Error(`Twelve Data API error: ${getMessage(dataJson)}`);
      }

      if (!dataJson.symbol) return null;
      const resolvedSymbol = String(dataJson.symbol);

      return {
        symbol: resolvedSymbol,
        price: parseFloat(String(dataJson.close)),
        currency: this.resolveCurrency(resolvedSymbol, dataJson),
        timestamp: this.resolveTimestamp(dataJson),
      };
    } catch (error) {
      if (this.log) {
        this.log.error({ err: error }, "Error fetching quote from TwelveData");
      } else {
        console.error("Error fetching quote from TwelveData:", error);
      }
      throw error;
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    // Twelve Data free tier allows max 8 symbols per batch request, configurable via DI
    const chunkSize = this.batchSize;
    const allQuotes: Quote[] = [];

    // Helper for sleep
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);

      try {
        if (!this.apiKey) {
          throw new Error("API Key is missing");
        }

        if (chunk.length === 1) {
          const quote = await this.getQuote(chunk[0]);
          if (quote) {
            allQuotes.push(quote);
          }
        } else {
          const symbolsStr = chunk.join(",");
          const url = `${this.baseUrl}/quote?symbol=${symbolsStr}&apikey=${this.apiKey}`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 429) throw new Error(RATE_LIMIT_ERROR);
            throw new Error(`Twelve Data API error: ${response.statusText}`);
          }

          const data: unknown = await response.json();
          if (!isRecord(data)) {
            throw new Error("Twelve Data API error: unexpected response format");
          }

          if (data.code && data.code !== 200) {
            if (isRateLimitPayload(data)) throw new Error(RATE_LIMIT_ERROR);
            throw new Error(
              `Twelve Data API error: ${getMessage(data)} (${symbolsStr})`,
            );
          }

          for (const key of Object.keys(data)) {
            const item = data[key];
            if (!isRecord(item)) {
              continue;
            }
            if (item.symbol && item.close) {
              const symbol = String(item.symbol);
              allQuotes.push({
                symbol,
                price: parseFloat(String(item.close)),
                currency: this.resolveCurrency(symbol, item),
                timestamp: this.resolveTimestamp(item),
              });
            }
          }
        }
      } catch (error: unknown) {
        if (isRateLimitError(error)) {
          if (this.log) {
            this.log.warn(
              `Rate limit reached on chunk ${chunk.join(",")}. Returning partial results.`,
            );
          } else {
            console.warn(
              `Rate limit reached on chunk ${chunk.join(",")}. Returning partial results.`,
            );
          }
          break; // Stop fetching more chunks, but don't fail the whole transaction
        }

        if (this.log) {
          this.log.error(
            { err: error },
            `Error fetching quotes from TwelveData for chunk ${chunk.join(",")}`,
          );
        } else {
          console.error(
            `Error fetching quotes from TwelveData for chunk ${chunk.join(",")}:`,
            error,
          );
        }
        throw error;
      }

      // Small delay between chunks to avoid bursting the 8 req/min limit too fast
      if (i + chunkSize < symbols.length) {
        await delay(500);
      }
    }

    return allQuotes;
  }
}
