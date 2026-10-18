import { spawnSync } from "node:child_process";

const MAX_BUFFER = 32 * 1024 * 1024;

export function spawnQuiet(command, args, options = {}) {
  const verbose = process.env.GOOSE_DEBUG === "1";
  const result = spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    stdio: verbose ? "inherit" : ["inherit", "pipe", "pipe"],
  });
  if (verbose) return result;
  if ((result.status ?? 1) !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) console.error(result.error.message);
  }
  return result;
}
