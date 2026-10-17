#!/usr/bin/env node
import * as esbuild from "esbuild";
import { createI18nEsbuildPlugin } from "./i18n/esbuildPlugin.mjs";
import { collectCatalog } from "./i18n/catalog.mjs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcemap =
  process.env.GOOSE_DEBUG === "1" || Boolean(process.env.ELECTRON_RENDERER_URL);

const { stale } = await collectCatalog(root, false);
if (stale.length) throw new Error("i18n declarations are stale. Run node scripts/i18n/check.mjs --generate.");

mkdirSync(resolve(root, "dist-electron/main"), { recursive: true });
mkdirSync(resolve(root, "dist-electron/preload"), { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "electron/main/index.ts")],
  bundle: true,
  plugins: [createI18nEsbuildPlugin()],
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: resolve(root, "dist-electron/main/index.js"),
  external: ["electron"],
  sourcemap,
  logLevel: "info",
});

await esbuild.build({
  absWorkingDir: root,
  entryPoints: { index: resolve(root, "electron/preload/index.ts"), previewWorker: resolve(root, "electron/preload/previewWorker.ts") },
  bundle: true,
  plugins: [createI18nEsbuildPlugin()],
  platform: "node",
  target: "node22",
  format: "cjs",
  outdir: resolve(root, "dist-electron/preload"),
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap,
  logLevel: "info",
});

console.log("[electron] compiled main + preload");
