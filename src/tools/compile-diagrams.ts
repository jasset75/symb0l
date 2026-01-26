import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../../");

function findPumlFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        findPumlFiles(filePath, fileList);
      }
    } else {
      if (file.endsWith(".puml")) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function compileDiagrams() {
  console.log("🔍 Scanning for .puml files...");
  const pumlFiles = findPumlFiles(ROOT_DIR);

  if (pumlFiles.length === 0) {
    console.log("No .puml files found.");
    return;
  }

  console.log(`Found ${pumlFiles.length} .puml files. Checking for updates...`);

  const start = Date.now();
  let updatedCount = 0;

  pumlFiles.forEach((pumlPath) => {
    // Determine output path:
    // If file is in doc/diagrams, output to doc/images
    // Otherwise, output strictly next to the file
    let svgPath = pumlPath.replace(".puml", ".svg");
    let outputDir = path.dirname(pumlPath);

    if (pumlPath.includes("doc/diagrams")) {
      const relativePath = path.relative(path.join(ROOT_DIR, "doc/diagrams"), pumlPath);
      svgPath = path.join(ROOT_DIR, "doc/images", relativePath.replace(".puml", ".svg"));
      outputDir = path.dirname(svgPath);

      // Ensure output directory exists (for subdirectories)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    }

    let needsCompile = false;

    if (!fs.existsSync(svgPath)) {
      needsCompile = true;
    } else {
      const pumlStat = fs.statSync(pumlPath);
      const svgStat = fs.statSync(svgPath);

      if (pumlStat.mtimeMs > svgStat.mtimeMs) {
        needsCompile = true;
      }
    }

    if (needsCompile) {
      console.log(
        `Compiling: ${path.relative(ROOT_DIR, pumlPath)} -> ${path.relative(ROOT_DIR, svgPath)}`
      );
      try {
        // Parse .env manually to avoid extra dependencies
        const envPath = path.join(ROOT_DIR, ".env");
        let javaBin = "java";
        let plantUmlJar = "";

        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf-8");
          envContent.split("\n").forEach((line) => {
            const [key, value] = line.split("=");
            if (key && value) {
              if (key.trim() === "JAVA_BIN") javaBin = value.trim();
              if (key.trim() === "PLANTUML_HOME") plantUmlJar = value.trim();
            }
          });
        }

        if (!plantUmlJar) {
          console.error("❌ PLANTUML_HOME not found in .env");
          process.exit(1);
        }

        // Run plantuml command directly using java
        // -o specifies output directory
        execSync(`"${javaBin}" -jar "${plantUmlJar}" -tsvg "${pumlPath}" -o "${outputDir}"`, {
          stdio: "inherit",
        });
        updatedCount++;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        console.error(`❌ Failed to compile ${path.relative(ROOT_DIR, pumlPath)}`);
        process.exit(1);
      }
    }
  });

  const duration = (Date.now() - start) / 1000;
  if (updatedCount > 0) {
    console.log(`✅ Compiled ${updatedCount} diagrams in ${duration.toFixed(2)}s.`);
  } else {
    console.log("✨ All diagrams up to date.");
  }
}

compileDiagrams();
