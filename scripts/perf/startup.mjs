#!/usr/bin/env node
/**
 * 启动与内存实测：反复启动真实 Electron 进程，按阶段汇总 p50/p95。
 *
 * 用法：
 *   node scripts/perf/startup.mjs                    # 测 dist-electron/app-pack
 *   node scripts/perf/startup.mjs --app dist-desktop/Thinkly.app --runs 7
 *   node scripts/perf/startup.mjs --json /tmp/after.json
 *   node scripts/perf/startup.mjs --compare /tmp/before.json
 *
 * 指标口径（全部以操作系统记录的进程创建时刻为零点）：
 *   main-module        主进程模块求值
 *   app-ready          Chromium 引导完成，可以建窗
 *   language-init-end  语言包读完（当前代码在建窗之前）
 *   restore-windows-end 窗口已创建、开始加载 HTML
 *   window-shown       窗口真正显示（用户感知的"打开"）
 *   did-finish-load    HTML 与首屏脚本执行完
 *   renderer-rendered   React 已提交首帧
 *   first-stable-frame 首帧稳定（双 rAF 之后）
 *
 * 注意：连续启动之间操作系统页缓存是热的，这里量的是"进程未运行时的启动"，
 * 不是清空页缓存的极端冷启动；后者需要 root 跑 purge，不作为日常口径。
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const appTarget = path.resolve(root, readArg("app", "dist-electron/app-pack"));
const runs = Number(readArg("runs", "5"));
const timeoutMs = Number(readArg("timeout", "60000"));
const jsonOut = readArg("json", "");
const compareWith = readArg("compare", "");
const profile = readArg("profile", "copy");

if (!existsSync(appTarget)) {
  console.error(`找不到构建产物：${appTarget}\n先运行 node scripts/run-task.mjs build`);
  process.exit(1);
}

function electronBinary() {
  const dist = path.join(root, "node_modules/electron/dist");
  if (process.platform === "darwin") {
    return path.join(dist, "Electron.app/Contents/MacOS/Electron");
  }
  if (process.platform === "win32") return path.join(dist, "electron.exe");
  return path.join(dist, "electron");
}

/** macOS .app 用自身的可执行文件；其他情况用 Electron 二进制 + 应用目录。 */
function launchCommand() {
  if (appTarget.endsWith(".app")) {
    const info = path.join(appTarget, "Contents/Info.plist");
    if (existsSync(info)) {
      const macos = path.join(appTarget, "Contents/MacOS");
      const [binary] = readdirSync(macos).filter((name) => !name.endsWith("Helper"));
      return { binary: path.join(macos, binary), args: [] };
    }
  }
  return { binary: electronBinary(), args: [appTarget] };
}

function runOnce(logPath, profileDir) {
  return new Promise((resolve, reject) => {
    const { binary, args: launchArgs } = launchCommand();
    const child = spawn(binary, launchArgs, {
      env: {
        ...process.env,
        GOOSE_PERF_LOG: logPath,
        GOOSE_PERF_EXIT: "1",
        GOOSE_PERF_SETTLE_MS: "1200",
        ...(profileDir ? { GOOSE_PERF_USERDATA: profileDir } : {}),
      },
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("启动超时：没有在限定时间内报告首帧稳定"));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function parseLog(logPath) {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function percentile(values, p) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function collect(samples) {
  const phases = new Map();
  const memory = [];
  let lastProcesses = [];
  for (const sample of samples) {
    for (const item of sample.events) {
      if (item.type === "phase") {
        if (!phases.has(item.phase)) phases.set(item.phase, []);
        phases.get(item.phase).push(item.at);
      }
      if (item.type === "memory") {
        memory.push(item.workingSetKB);
        lastProcesses = item.processes ?? [];
      }
    }
  }
  const summary = {};
  for (const [phase, values] of phases) {
    summary[phase] = { p50: percentile(values, 50), p95: percentile(values, 95), n: values.length };
  }
  if (memory.length) {
    summary["processes"] = lastProcesses
      .map((item) => ({ type: item.type, kb: item.memoryKB }))
      .sort((a, b) => b.kb - a.kb);
    summary["memory.workingSetMB"] = {
      p50: Math.round(percentile(memory, 50) / 1024),
      p95: Math.round(percentile(memory, 95) / 1024),
      n: memory.length,
    };
  }
  return summary;
}

const ORDER = [
  "main-module",
  "app-ready",
  "language-init-end",
  "web-contents:workspace",
  "dom-ready:workspace",
  "restore-windows-end",
  "ready-to-show:workspace",
  "window-shown:workspace",
  "did-finish-load:workspace",
  "renderer-rendered:workspace",
  "first-stable-frame:workspace",
  "memory.workingSetMB",
];

function printTable(summary, baseline) {
  const rows = [...ORDER.filter((key) => summary[key] && key !== "processes"), ...Object.keys(summary).filter((key) => !ORDER.includes(key) && key !== "processes")];
  const width = Math.max(...rows.map((row) => row.length), 20);
  console.log(`${"阶段".padEnd(width)}  ${"p50".padStart(7)}  ${"p95".padStart(7)}${baseline ? `  ${"对比之前".padStart(9)}` : ""}`);
  for (const row of rows) {
    const item = summary[row];
    const unit = row.endsWith("MB") ? "MB" : "ms";
    const delta = baseline?.[row]?.p50;
    const diff = delta == null ? "" : `${item.p50 - delta >= 0 ? "+" : ""}${item.p50 - delta}${unit}`;
    console.log(
      `${row.padEnd(width)}  ${`${item.p50}${unit}`.padStart(7)}  ${`${item.p95}${unit}`.padStart(7)}${baseline ? `  ${diff.padStart(9)}` : ""}`,
    );
  }
  if (summary.processes?.length) {
    console.log("\n内存分解（最后一次采样）");
    for (const item of summary.processes) {
      console.log(`  ${item.type.padEnd(10)} ${String(Math.round(item.kb / 1024)).padStart(5)}MB`);
    }
  }
}

const workDir = mkdtempSync(path.join(tmpdir(), "thinkly-perf-"));

/** 复制一份真实配置目录：保留设置与窗口布局，不碰正在运行的正式实例。 */
function prepareProfile() {
  if (profile === "real") return null;
  const dir = path.join(workDir, "profile");
  if (profile === "empty") return dir;
  const source = path.join(homedir(), "Library/Application Support/Thinkly");
  if (!existsSync(source)) return dir;
  cpSync(source, dir, {
    recursive: true,
    filter: (from) => !/(Cache|Code Cache|GPUCache|Dawn.*Cache|blob_storage|Partitions)/.test(path.basename(from)),
  });
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    rmSync(path.join(dir, name), { force: true });
  }
  return dir;
}

const profileDir = prepareProfile();
const samples = [];
try {
  for (let index = 0; index < runs; index += 1) {
    const logPath = path.join(workDir, `run-${index}.jsonl`);
    process.stdout.write(`\r第 ${index + 1}/${runs} 次启动…`);
    await runOnce(logPath, profileDir);
    samples.push({ events: parseLog(logPath) });
  }
  process.stdout.write("\r");
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

const summary = collect(samples);
const baseline = compareWith
  ? JSON.parse(readFileSync(path.resolve(root, compareWith), "utf8"))
  : null;
console.log(`\n目标：${path.relative(root, appTarget)}  运行 ${runs} 次\n`);
printTable(summary, baseline?.summary ?? null);
if (jsonOut) {
  const target = path.resolve(root, jsonOut);
  writeFileSync(target, `${JSON.stringify({ target: appTarget, runs, summary }, null, 2)}\n`);
  console.log(`\n已写入 ${path.relative(root, target)}`);
}
