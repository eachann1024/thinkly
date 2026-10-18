#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawnQuiet } from "./spawn-quiet.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [task, ...args] = process.argv.slice(2);
const generateColors = ["scripts/generate-text-colors.mjs"];
const vite = "node_modules/vite/bin/vite.js";
const build = [
  generateColors,
  ["src/lib/vite-stubs/assert-present.mjs"],
  [vite, "build", ...args],
  ["scripts/compile-electron.mjs"],
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
const run = quiet ? spawnQuiet : spawnSync;

for (const command of tasks[task]) {
  const result = run(process.execPath, command, {
    cwd: root,
    env,
    ...(quiet ? {} : { stdio: "inherit" }),
  });
  if (!quiet && result.error) {
    console.error(`[${task}] ${command[0]}: ${result.error.message}`);
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
