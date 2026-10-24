import { execFile } from "node:child_process";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { discardDirectory } from "./staging";

const exec = promisify(execFile);
/** Sibling of the installed .app. Node's mkdtemp suffix is [A-Za-z0-9]. */
const STAGE_NAME = /^\.goose-update-[A-Za-z0-9]+$/;
const LSREGISTER = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

export function isUpdateStageName(name: string): boolean {
  return STAGE_NAME.test(name);
}

export function livesInUpdateStage(appBundle: string): boolean {
  return path.resolve(appBundle).split(path.sep).some((part) => isUpdateStageName(part));
}

async function unregisterStagedApps(stage: string): Promise<void> {
  if (process.platform !== "darwin") return;
  let names: string[] = [];
  try { names = await readdir(stage); } catch { return; }
  for (const name of names) {
    if (!name.endsWith(".app")) continue;
    const bundle = path.join(stage, name);
    try {
      const info = await lstat(bundle);
      if (info.isSymbolicLink() || !info.isDirectory()) continue;
      await exec(LSREGISTER, ["-u", bundle]);
    } catch { /* Launch Services is absent outside macOS, and a missing bundle is already gone. */ }
  }
}

/**
 * Remove install swap directories sitting next to the real app.
 * Only a direct child named `.goose-update-[A-Za-z0-9]+` is removed.
 * The app bundle itself, other apps, symlinks, and stages we are running from stay.
 */
export async function removeSiblingUpdateStages(appBundle: string): Promise<string[]> {
  const removed: string[] = [];
  if (!appBundle.endsWith(".app") || livesInUpdateStage(appBundle)) return removed;
  const parent = path.dirname(path.resolve(appBundle));
  if (parent === path.parse(parent).root) return removed;
  let names: string[];
  try { names = await readdir(parent); } catch { return removed; }
  for (const name of names) {
    if (!isUpdateStageName(name)) continue;
    const stage = path.join(parent, name);
    try {
      const info = await lstat(stage);
      if (info.isSymbolicLink() || !info.isDirectory()) continue;
    } catch { continue; }
    await unregisterStagedApps(stage);
    await discardDirectory(stage, { strict: false });
    removed.push(name);
  }
  return removed;
}
