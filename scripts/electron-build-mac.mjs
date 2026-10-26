#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
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
const electronDist = resolve(root, "node_modules/electron/dist");
const args = [
  cli,
  "--mac",
  "--arm64",
  "--config.mac.target=dir",
];
// Electron 44 安装时不下载二进制，CI 上 node_modules/electron/dist 不存在。
// 本机已有该目录时继续用它；否则不要传入 electronDist，让 electron-builder 下载 zip。
// default_app.asar 仍由 afterPack 删除。
if (existsSync(electronDist) && statSync(electronDist).isDirectory()) {
  args.push(`--config.electronDist=${electronDist}`);
}
const result = spawnQuiet(process.execPath, args, {
  env,
  cwd: pack,
});
if (result.status !== 0) process.exit(result.status ?? 1);
if (process.env.GOOSE_QUIET !== "1") console.log("✓ macOS 应用");
