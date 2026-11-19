#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawnQuiet } from "./spawn-quiet.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [task, ...args] = process.argv.slice(2);
const generateColors = ["scripts/generate-text-colors.mjs"];
const vite = "node_modules/vite/bin/vite.js";
// Each item is either a single command (array of strings) or a parallel batch (array of commands).
const build = [
  [generateColors, ["src/lib/vite-stubs/assert-present.mjs"]],
  [[vite, "build", ...args], ["scripts/compile-electron.mjs"]],
  ["scripts/prepare-electron-pack.mjs"],
];

const tasks = {
  dev: [generateColors, [vite, ...args]],
  build,
  window: [
    ...build,
    ["scripts/electron-build-win.mjs"],
    ["scripts/collect-desktop-artifacts.mjs"],
  ],
  linux: [
    ...build,
    ["scripts/electron-build-linux.mjs"],
    ["scripts/collect-desktop-artifacts.mjs"],
  ],
};

if (!Object.hasOwn(tasks, task)) {
  console.error(`Usage: node scripts/run-task.mjs <${Object.keys(tasks).join("|")}> [vite options]`);
  process.exit(1);
}

const env = { ...process.env };
const quiet = task !== "dev" && process.env.GOOSE_DEBUG !== "1";

function runAsync(command) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, command, {
      cwd: root,
      env,
      stdio: quiet ? ["inherit", "pipe", "pipe"] : "inherit",
    });
    const out = [];
    const err = [];
    if (quiet) {
      child.stdout?.on("data", (chunk) => out.push(chunk));
      child.stderr?.on("data", (chunk) => err.push(chunk));
    }
    child.on("error", (error) => {
      if (!quiet) console.error(`[${task}] ${command[0]}: ${error.message}`);
      else console.error(error.message);
      resolve(1);
    });
    child.on("close", (code) => {
      const status = code ?? 1;
      if (quiet && status !== 0) {
        if (out.length) process.stderr.write(Buffer.concat(out));
        if (err.length) process.stderr.write(Buffer.concat(err));
      }
      resolve(status);
    });
  });
}

const runSync = quiet ? spawnQuiet : spawnSync;

for (const step of tasks[task]) {
  if (Array.isArray(step[0])) {
    const statuses = await Promise.all(step.map((command) => runAsync(command)));
    const failed = statuses.find((status) => status !== 0);
    if (failed !== undefined) process.exit(failed);
    continue;
  }
  const result = runSync(process.execPath, step, {
    cwd: root,
    env,
    ...(quiet ? {} : { stdio: "inherit" }),
  });
  if (!quiet && result.error) {
    console.error(`[${task}] ${step[0]}: ${result.error.message}`);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (quiet && process.env.GOOSE_QUIET !== "1") {
  const done = {
    build: "✓ 构建完成",
    window: "✓ Windows 安装包",
    linux: "✓ Linux 安装包",
  };
  console.log(done[task]);
}
