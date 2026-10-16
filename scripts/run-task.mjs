#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

for (const command of tasks[task]) {
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`[${task}] ${command[0]}: ${result.error.message}`);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
