#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const args = process.argv.slice(2);
const engine = (process.env.TYPECHECK_ENGINE || "auto").toLowerCase();

function tsrsPackage() {
  const key = `${process.platform}-${process.arch}`;
  if (key === "darwin-arm64") return "@tsrs/darwin-arm64";
  if (key === "linux-x64" || key === "linux-arm64") {
    const report = process.report && process.report.getReport ? process.report.getReport() : null;
    const glibc = report && report.header && report.header.glibcVersionRuntime;
    return `@tsrs/${key}-${glibc ? "gnu" : "musl"}`;
  }
  return null;
}

function findTsrs() {
  if (process.env.TSRS_BINARY) {
    return existsSync(process.env.TSRS_BINARY) ? process.env.TSRS_BINARY : null;
  }
  const pkg = tsrsPackage();
  if (!pkg) return null;
  const bases = [];
  try {
    bases.push(createRequire(require.resolve("tsrs/package.json")));
  } catch {
  }
  bases.push(require);
  for (const req of bases) {
    try {
      const exe = path.join(path.dirname(req.resolve(`${pkg}/package.json`)), "tsrs");
      if (existsSync(exe)) return exe;
    } catch {
    }
  }
  return null;
}

function runTsc(reason) {
  if (reason) console.error(`[typecheck] ${reason}，改用 tsc`);
  let tsc;
  try {
    const pkgJson = require.resolve("typescript/package.json");
    const bin = require(pkgJson).bin;
    tsc = path.join(path.dirname(pkgJson), typeof bin === "string" ? bin : bin.tsc);
    if (!existsSync(tsc)) throw new Error(tsc);
  } catch {
    console.error("[typecheck] 找不到本地 typescript，无法兜底");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [tsc, ...args], { stdio: "inherit" });
  if (r.error) {
    console.error(`[typecheck] tsc 启动失败：${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status === null ? 1 : r.status);
}

if (engine === "tsc") runTsc("");

const exe = findTsrs();
if (!exe) {
  if (engine === "tsrs") {
    console.error("[typecheck] TYPECHECK_ENGINE=tsrs，但本机没有可用的 tsrs 二进制");
    process.exit(1);
  }
  runTsc(`tsrs 不支持或未安装（${process.platform}-${process.arch}）`);
}

const r = spawnSync(exe, args, { stdio: "inherit" });
if (!r.error && r.signal === null && r.status !== null && r.status <= 2) process.exit(r.status);
const why = r.error ? `启动失败：${r.error.message}` : r.signal ? `被信号 ${r.signal} 终止` : `异常退出（${r.status}）`;
if (engine === "tsrs") {
  console.error(`[typecheck] tsrs ${why}`);
  process.exit(1);
}
runTsc(`tsrs ${why}`);
