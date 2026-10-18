#!/usr/bin/env node
import { execSync } from "node:child_process";
import { spawnQuiet } from "./spawn-quiet.mjs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:process";

const isWindows = platform === "win32";

if (!isWindows) {
  try {
    execSync("wine --version", { stdio: "ignore" });
  } catch {
    console.error("[win] 在 macOS/Linux 上打包 Windows 安装包需要 Wine。");
    console.error("      请安装 Wine 后重试，例如：brew install --cask wine-stable");
    console.error("      不支持 mingw 交叉编译。");
    process.exit(1);
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "dist-electron/app-pack");

const env = {
  ...process.env,
  PATH: `${resolve(root, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
const cli = resolve(root, "node_modules/electron-builder/out/cli/cli.js");
const result = spawnQuiet(process.execPath, [cli, "--win", "nsis", "--x64"], { env, cwd: pack });
if (result.status !== 0) process.exit(result.status ?? 1);
if (process.env.GOOSE_QUIET !== "1") console.log("✓ Windows 安装包");
