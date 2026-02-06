export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string; // ISO string
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote | null>;
}
