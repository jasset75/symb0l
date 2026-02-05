/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATE_FILE = path.resolve(__dirname, "../../tmp/validate.txt");
const SOURCE_FILE = path.resolve(__dirname, "../../tmp/symbol_source.txt");
const SEEDS_DIR = path.resolve(__dirname, "../seeds");

// Helpers
const readFile = (filePath: string) => fs.readFileSync(filePath, "utf-8");
const writeFile = (fileName: string, content: string) => {
  fs.writeFileSync(path.join(SEEDS_DIR, fileName), content.trim() + "\n");
  console.log(`Generated ${fileName}`);
};

const parseTsv = (content: string) => {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const headers = lines[0].split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return headers.reduce(
      (acc, header, index) => {
        acc[header] = values[index]?.trim() || "";
        return acc;
      },
      {} as Record<string, string>
    );
  });
};

function generateMasterSeeds() {
  const validateContent = readFile(VALIDATE_FILE);
  const data = parseTsv(validateContent);

  // Profile
  const profiles = data
    .filter((d) => d.Profile)
    .map((d, i) => ({
      profile_id: i + 1,
      name: d.Profile,
    }));
  writeSeedFile("profiles.ts", "profiles", profiles);

  // Risk Level
  const riskLevels = data
    .filter((d) => d["Risk Level"])
    .map((d, i) => ({
      risk_level_id: i + 1,
      name: d["Risk Level"],
      weight: parseInt(d["Risk Weight"] || "0", 10),
    }));
  writeSeedFile("risk_levels.ts", "riskLevels", riskLevels);

  // Asset Class Level (mapped from Level)
  const assetClassLevels = data
    .filter((d) => d.Level)
    .map((d, i) => ({
      asset_class_level_id: i + 1,
      name: d.Level,
      description: d["Level Desc"],
    }));
  writeSeedFile("asset_class_levels.ts", "assetClassLevels", assetClassLevels);

  // Market Cap
  const marketCaps = data
    .filter((d) => d["Market Cap"])
    .map((d, i) => ({
      market_cap_id: i + 1,
      name: d["Market Cap"],
    }));
  writeSeedFile("market_caps.ts", "marketCaps", marketCaps);

  // Sector
  const sectors = data
    .filter((d) => d["Sector GICS"])
    .map((d, i) => ({
      sector_id: i + 1,
      name: d["Sector GICS"],
      description: d["Sector Desc"],
    }));
  writeSeedFile("sectors.ts", "sectors", sectors);

  // Sub Industry
  const subIndustries = data
    .filter((d) => d["Sub-Industry GICS"])
    .map((d, i) => ({
      sub_industry_id: i + 1,
      name: d["Sub-Industry GICS"],
    }));
  writeSeedFile("sub_industries.ts", "subIndustries", subIndustries);

  // Country Exposure
  const countryExposures = data
    .filter((d) => d["Country Exposure"])
    .map((d, i) => ({
      country_exposure_id: i + 1,
      name: d["Country Exposure"],
    }));
  writeSeedFile("country_exposures.ts", "countryExposures", countryExposures);

  return {
    profiles,
    riskLevels,
    assetClassLevels,
    marketCaps,
    sectors,
    subIndustries,
    countryExposures,
  };
}

function generateInstrumentsSeed() {
  const sourceContent = readFile(SOURCE_FILE);
  const data = parseTsv(sourceContent);

  // Existing fields + metadata names for lookup
  const instruments = data
    .filter((d) => d.Name && d.Name.trim() !== "")
    .map((d, i) => ({
      instrument_id: i + 1,
      // Handle symbol_source weirdness where Name might be missing/dup
      isin: d.ISIN || null,
      name: d.Name,
      instrument_type: decideInstrumentType(d),
      // Metadata fields for resolution
      profile_name: d.Profile || null,
      risk_level_name: d.Risk || null,
      asset_class_level_name: d.Level || null,
      market_cap_name: d["Market Cap"] || null,
      sector_name: d.Sector || null,
      sub_industry_name: d["Sub Industry"] || null, // Note source header is Sub Industry vs validate Sub-Industry GICS
      country_exposure_name: d["Country Exposure"] || null,
    }));

  // We need to keep the type info but also export the raw data
  // The structure matches what we expect in the db, but with extra fields for resolution
  // We redefine the interface in the seed file itself

  writeInstrumentsSeedFile(instruments);
}

function decideInstrumentType(d: any) {
  // Simple heuristic based on source data
  if (d.Sector === "ETFs" || d.Name.includes("ETF")) return "ETF";
  if (d.Sector === "FX") return "Currency Pair";
  if (d.Sector === "Commodities" || d.Name.includes("ETC")) return "ETC";
  return "Common Stock";
}

function writeSeedFile(fileName: string, variableName: string, data: any[]) {
  const content = `
export const ${variableName} = ${JSON.stringify(data, null, 2)};
`;
  writeFile(fileName, content);
}

function writeInstrumentsSeedFile(data: any[]) {
  // Generate Interface
  const interfaceDef = `
export interface InstrumentData {
  instrument_id: number;
  isin: string | null;
  name: string;
  instrument_type: string;
  profile_name: string | null;
  risk_level_name: string | null;
  asset_class_level_name: string | null;
  market_cap_name: string | null;
  sector_name: string | null;
  sub_industry_name: string | null;
  country_exposure_name: string | null;
}
`;

  const content = `
${interfaceDef}

export const instruments: InstrumentData[] = ${JSON.stringify(data, null, 2)};
`;
  writeFile("instruments.ts", content);
}

function main() {
  console.log("Generating static seeds...");
  generateMasterSeeds();
  generateInstrumentsSeed();
  console.log("Done.");
}

main();
