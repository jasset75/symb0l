export class TwelveDataService {
  private apiKey: string;
  private baseUrl = "https://api.twelvedata.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string) {
    try {
      const apiKey = this.apiKey || process.env.TWELVE_DATA_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing");
      }

      const url = `${this.baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code && data.code !== 200) {
        throw new Error(`Twelve Data API error: ${data.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      throw error;
    }
  }
}

export const twelveData = new TwelveDataService(
  process.env.TWELVE_DATA_API_KEY || "",
);
