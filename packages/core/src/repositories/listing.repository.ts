import { db } from "../db.js";

export class ListingRepository {
  /**
   * Validates a list of symbols against the database.
   * Returns the list of symbols that were found in the database.
   */
  async validateSymbols(symbols: string[]): Promise<string[]> {
    if (symbols.length === 0) {
      return [];
    }

    // Create placeholders for the IN clause
    const placeholders = symbols.map(() => "?").join(",");
    const query = `
      SELECT symbol_code 
      FROM listing 
      WHERE symbol_code IN (${placeholders})
    `;

    try {
      const statement = db.prepare(query);
      // node:sqlite `all` returns an array of objects
      const results = statement.all(...symbols) as { symbol_code: string }[];

      return results.map((row) => row.symbol_code);
    } catch (error) {
      console.error("Error validating symbols:", error);
      throw error;
    }
  }
}
