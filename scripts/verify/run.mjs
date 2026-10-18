#!/usr/bin/env node
// 验收脚本运行器：用项目同款 i18n 编译把 scripts/verify/<name>.ts 打包后直接执行。
// 用法：node scripts/verify/run.mjs columns   （不带参数则依次运行全部验收）
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
