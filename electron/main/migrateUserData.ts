import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { app } from "electron";

const NEXT_NAME = "Thinkly";
const PREVIOUS_NAME = "Goose Note";

function moveIfMissing(from: string, to: string): void {
  if (existsSync(to) || !existsSync(from)) return;
  try { renameSync(from, to); } catch {   }
}

export function pinUserDataDirectory(): string {
  const overridden = process.env.GOOSE_PERF_USERDATA;
  if (overridden) {
    mkdirSync(overridden, { recursive: true });
    app.setPath("userData", overridden);
    return overridden;
  }
  const next = path.join(app.getPath("appData"), NEXT_NAME);
  const previous = path.join(app.getPath("appData"), PREVIOUS_NAME);
  moveIfMissing(previous, next);
  if (process.platform === "darwin") {
    const logs = path.join(app.getPath("home"), "Library", "Logs");
    moveIfMissing(path.join(logs, PREVIOUS_NAME), path.join(logs, NEXT_NAME));
  }
  const chosen = existsSync(next) ? next : previous;
  mkdirSync(chosen, { recursive: true });
  app.setPath("userData", chosen);
  return chosen;
}
