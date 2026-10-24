#!/usr/bin/env node
import { execSync } from "node:child_process";
import { spawnQuiet } from "./spawn-quiet.mjs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:process";

if (platform !== "linux") {
  console.error("[linux] bun run linux 面向 Linux 打包；当前平台不是 Linux。");
  console.error("       请在目标 Linux 系统（如 Omarchy / Arch）上执行。");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "dist-electron/app-pack");

function stopRunningApp() {
  const shell = (cmd) => {
    try {
      return execSync(cmd, { encoding: "utf8", shell: true }).trim();
    } catch {
      return "";
    }
  };
  try {
    const proc = shell("pgrep -x thinkly || pgrep -x goose-note-app || true");
    if (!proc) return;
    shell("pkill -x thinkly || true");
    shell("pkill -x goose-note-app || true");
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (!shell("pgrep -x thinkly || pgrep -x goose-note-app || true")) return;
      shell("sleep 0.5");
    }
    shell("pkill -9 -x thinkly || true");
    shell("pkill -9 -x goose-note-app || true");
  } catch (err) {
    console.warn(
      "[linux] 停止旧实例失败（继续打包）：",
      err.message || String(err),
    );
  }
}

stopRunningApp();

const env = {
  ...process.env,
  PATH: `${resolve(root, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
const cli = resolve(root, "node_modules/electron-builder/out/cli/cli.js");
const result = spawnQuiet(process.execPath, [cli, "--linux"], { env, cwd: pack });
if (result.status !== 0) process.exit(result.status ?? 1);
if (process.env.GOOSE_QUIET !== "1") console.log("✓ Linux 安装包");
