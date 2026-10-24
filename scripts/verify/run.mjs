#!/usr/bin/env node
import { build } from "esbuild";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createI18nEsbuildPlugin } from "../i18n/esbuildPlugin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const requested = process.argv.slice(2);
const names = requested.length
  ? requested
  : (await readdir(here)).filter((file) => file.endsWith(".ts")).map((file) => file.slice(0, -3));

const outDir = await mkdtemp(path.join(tmpdir(), "goose-verify-"));
let failed = 0;
try {
  for (const name of names) {
    const outfile = path.join(outDir, `${name}.mjs`);
    await build({
      entryPoints: [path.join(here, `${name}.ts`)],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      jsx: "automatic",
      logLevel: "error",
      alias: { "@": path.join(root, "src") },
      loader: { ".css": "empty", ".svg": "empty", ".png": "empty", ".woff2": "empty", ".ttf": "empty" },
      define: { __GOOSE_EDITOR_COMPACT__: "false", __GOOSE_EDITOR_AI__: "true", __GOOSE_PRINT_READY__: "false" },
      banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
      plugins: [createI18nEsbuildPlugin()],
    });
    console.log(`\n▶ ${name}`);
    const { default: run } = await import(pathToFileURL(outfile).href);
    failed += await run();
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
console.log(failed ? `\n✗ 共 ${failed} 项未通过` : "\n✓ 全部通过");
process.exit(failed ? 1 : 0);
