#!/usr/bin/env node
import * as esbuild from "esbuild";
import { createI18nEsbuildPlugin } from "./i18n/esbuildPlugin.mjs";
import { collectCatalog } from "./i18n/catalog.mjs";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcemap =
  process.env.GOOSE_DEBUG === "1" || Boolean(process.env.ELECTRON_RENDERER_URL);

await collectCatalog(root, true);

mkdirSync(resolve(root, "dist-electron/main"), { recursive: true });
mkdirSync(resolve(root, "dist-electron/preload"), { recursive: true });

// 正式构建不写 sourcemap；之前调试构建留下的 .map 会一直躺在产物里，
// 除了占体积，还会让人以为正式包带了源码。
if (!sourcemap) {
  for (const dir of ["main", "preload"]) {
    for (const name of ["index.js", "previewWorker.js"]) {
      rmSync(resolve(root, "dist-electron", dir, `${name}.map`), { force: true });
    }
  }
}

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
  logLevel: process.env.GOOSE_DEBUG === "1" ? "info" : "silent",
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
  logLevel: process.env.GOOSE_DEBUG === "1" ? "info" : "silent",
});
