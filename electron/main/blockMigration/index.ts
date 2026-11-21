import { app } from "electron";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectNotebooks, writeBlockState } from "./notebooks";
import { installBlockMac } from "./mac";
import { installBlockWindows } from "./windows";

const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const payloadDir = () => path.join(process.resourcesPath, "block-migration");
const recordPath = () => path.join(app.getPath("userData"), "block-migration.json");

function payloadPath(): string | null {
  if (process.platform === "darwin") return path.join(payloadDir(), `block-macos-${process.arch === "arm64" ? "arm64" : "x64"}.dmg`);
  if (process.platform === "win32" && process.arch === "x64") return path.join(payloadDir(), "block-windows-x64-setup.exe");
  return null;
}

function failedRecently(): boolean {
  try {
    const record = JSON.parse(readFileSync(recordPath(), "utf8")) as { failedAt?: unknown };
    return typeof record.failedAt === "number" && Date.now() - record.failedAt < RETRY_AFTER_MS;
  } catch {
    return false;
  }
}

function recordFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  try {
    writeFileSync(recordPath(), JSON.stringify({ failedAt: Date.now(), message }), { mode: 0o600 });
  } catch (writeError) {
    console.error("[block-migration] could not record the failure", writeError);
  }
}

export async function migrateToBlock(): Promise<boolean> {
  if (!app.isPackaged) return false;
  const payload = payloadPath();
  if (!payload || !existsSync(payload) || failedRecently()) return false;
  try {
    const snapshot = await collectNotebooks(path.join(payloadDir(), "blank.html"));
    const prepare = () => writeBlockState(snapshot);
    if (process.platform === "darwin") await installBlockMac(payload, prepare);
    else await installBlockWindows(payload, prepare);
    rmSync(recordPath(), { force: true });
    return true;
  } catch (error) {
    console.error("[block-migration]", error);
    recordFailure(error);
    return false;
  }
}
