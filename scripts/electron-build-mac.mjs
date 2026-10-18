#!/usr/bin/env node
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:process";
import { spawnQuiet } from "./spawn-quiet.mjs";

if (platform !== "darwin") {
  console.error("[mac] bun run mac 仅支持 macOS（产出 Apple Silicon arm64 .app）");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "dist-electron/app-pack");

const env = {
  ...process.env,
  PATH: `${resolve(root, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
const cli = resolve(root, "node_modules/electron-builder/out/cli/cli.js");
const result = spawnQuiet(process.execPath, [cli, "--mac", "--arm64", "--config.mac.target=dir"], {
  env,
  cwd: pack,
});
if (result.status !== 0) process.exit(result.status ?? 1);
if (process.env.GOOSE_QUIET !== "1") console.log("✓ macOS 应用");
