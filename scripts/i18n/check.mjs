#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectCatalog } from "./catalog.mjs";
import { inventoryHan } from "./inventory.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const generate = process.argv.includes("--generate");
try {
  const { entries, stale, codeFiles } = await collectCatalog(root, generate);
  const digest = createHash("sha256").update(JSON.stringify(entries.map(({ source, resources }) => ({ source, resources })))).digest("hex");
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1) {
    if (!process.argv[reportIndex + 1]) throw new Error("--report requires a destination path.");
    const destination = resolve(process.argv[reportIndex + 1]);
    const candidates = codeFiles.flatMap(({ source, code }) => inventoryHan(code, source));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify({ digest, resourceCount: entries.length, logicalKeyCount: entries.reduce((n, entry) => n + Object.keys(entry.schema).length, 0), entries, untranslatedCandidates: candidates }, null, 2)}\n`);
    console.log(`[i18n] Review inventory: ${destination}; ${candidates.length} untranslated candidates (requires classification).`);
  }
  if (stale.length) throw new Error(`Generated types are stale. Run node scripts/i18n/check.mjs --generate.\n${stale.map((file) => `  ${file}`).join("\n")}`);
  console.log(`[i18n] ${generate ? "Generated and validated" : "Validated"} ${entries.length} resources; ${entries.reduce((n, entry) => n + Object.keys(entry.schema).length, 0)} logical keys; sha256 ${digest}`);
} catch (error) {
  console.error(`[i18n] ${error.message}`);
  process.exitCode = 1;
}
