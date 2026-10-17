import { lstat, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { durableAtomicWrite } from "./gitSyncDisk";

export interface NotebookRenameIntent {
  notebookId: string;
  previous: string;
  next: string;
  name: string;
}

const fileOf = (userData: string) => path.join(userData, "notebook-rename-intent.json");

export async function writeNotebookRenameIntent(userData: string, intent: NotebookRenameIntent): Promise<void> {
  await durableAtomicWrite(fileOf(userData), JSON.stringify(intent));
}

export async function clearNotebookRenameIntent(userData: string): Promise<void> {
  await rm(fileOf(userData), { force: true });
}

async function directoryOf(target: string): Promise<string | null> {
  try {
    const info = await lstat(target);
    if (!info.isDirectory() || info.isSymbolicLink()) return null;
    return await realpath(target);
  } catch {
    return null;
  }
}

export async function readFinishedNotebookRenameIntent(userData: string): Promise<NotebookRenameIntent | null> {
  let intent: NotebookRenameIntent;
  try {
    intent = JSON.parse(await readFile(fileOf(userData), "utf8")) as NotebookRenameIntent;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    await clearNotebookRenameIntent(userData);
    return null;
  }
  if (!intent || typeof intent.notebookId !== "string" || typeof intent.previous !== "string" || typeof intent.next !== "string" || typeof intent.name !== "string") {
    await clearNotebookRenameIntent(userData);
    return null;
  }
  const previous = await directoryOf(intent.previous);
  const next = await directoryOf(intent.next);
  const landed = next !== null && path.basename(next).normalize("NFC") === intent.name.normalize("NFC");
  if (landed && (previous === null || previous === next)) return intent;
  await clearNotebookRenameIntent(userData);
  return null;
}
