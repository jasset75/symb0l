import {
  MarketDataProvider,
  Quote,
} from "../../domain/interfaces/market-data-provider.js";
import { FastifyBaseLogger } from "fastify";

export class TwelveDataProvider implements MarketDataProvider {
  private baseUrl = "https://api.twelvedata.com";

  constructor(
    private apiKey: string,
    private readonly log?: FastifyBaseLogger,
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
      // @ts-ignore
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const dataJson = await response.json();

      if (dataJson.code && dataJson.code !== 200) {
        throw new Error(`Twelve Data API error: ${dataJson.message}`);
      }

      if (!dataJson.symbol) return null;
      const payload = dataJson as Record<string, unknown>;
      const resolvedSymbol = String(payload.symbol);

      return {
        symbol: resolvedSymbol,
        price: parseFloat(String(payload.close)),
        currency: this.resolveCurrency(resolvedSymbol, payload),
        timestamp: this.resolveTimestamp(payload),
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
    if (symbols.length === 1) {
      const quote = await this.getQuote(symbols[0]);
      return quote ? [quote] : [];
    }

    try {
      if (!this.apiKey) {
        throw new Error("API Key is missing");
      }

      const symbolsStr = symbols.join(",");
      const url = `${this.baseUrl}/quote?symbol=${symbolsStr}&apikey=${this.apiKey}`;
      // @ts-ignore
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Batch response is an object where keys are symbols, OR it might be an error at top level
      if (data.code && data.code !== 200) {
        throw new Error(`Twelve Data API error: ${data.message}`);
      }

      const quotes: Quote[] = [];

      for (const key of Object.keys(data)) {
        const item = data[key] as Record<string, unknown>;
        // Check if individual item has error or valid data
        if (item.symbol && item.close) {
          const symbol = String(item.symbol);
          quotes.push({
            symbol,
            price: parseFloat(String(item.close)),
            currency: this.resolveCurrency(symbol, item),
            timestamp: this.resolveTimestamp(item),
          });
        }
      }

      return quotes;
    } catch (error) {
      if (this.log) {
        this.log.error({ err: error }, "Error fetching quotes from TwelveData");
      } else {
        console.error("Error fetching quotes from TwelveData:", error);
      }
      throw error;
    }
  }
}
