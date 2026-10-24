import { t } from "./i18n/gitErrors";
import { gitNotebookDirectory } from "../../src/lib/git-notebook-directory";
import type { GitRepositoryInput } from "../../src/lib/git-sync-contract";

export interface GitLayoutMove { notebookId: string; from: string; to: string }
type Snapshots = Record<string, Record<string, string>>;

export function planGitLayout(input: GitRepositoryInput) {
  const config = structuredClone(input);
  const moves: GitLayoutMove[] = [];
  if (config.layout === "subfolders") {
    for (const folder of config.folders) {
      const directory = gitNotebookDirectory(folder.localPath);
      if (folder.remotePath !== directory) moves.push({ notebookId: folder.notebookId, from: folder.remotePath, to: directory });
      folder.remotePath = directory;
    }
    const names = config.folders.map((folder) => folder.remotePath.normalize("NFC").toLowerCase());
    if (new Set(names).size !== names.length) throw new Error(t("duplicateFolders"));
    if (moves.some((move) => config.folders.some((folder) => folder.notebookId !== move.notebookId && folder.remotePath.normalize("NFC").toLowerCase() === move.from.normalize("NFC").toLowerCase()))) {
      throw new Error(t("migrationDuplicate"));
    }
  }
  return { config, moves };
}

export function aliasGitLayout(snapshots: Snapshots | undefined, moves: GitLayoutMove[]) {
  if (!snapshots) return;
  for (const move of moves) {
    const oldKey = `${move.notebookId}:${move.from}`, newKey = `${move.notebookId}:${move.to}`;
    if (!Object.hasOwn(snapshots, oldKey)) continue;
    if (!Object.hasOwn(snapshots, newKey)) snapshots[newKey] = snapshots[oldKey]!;
  }
}

export function gitLayoutMetadata(previous: string | null, config: GitRepositoryInput, moves: GitLayoutMove[]): string {
  const saved = previous ? JSON.parse(previous) : { version: 1, folders: [] };
  if (saved.version !== 1 || !Array.isArray(saved.folders)) throw new Error(t("mappingUnreadable"));
  const matches = (entry: { notebookId: string; path: string }, folder: GitRepositoryInput["folders"][number]) =>
    entry.notebookId === folder.notebookId || entry.path?.normalize("NFC").toLowerCase() === folder.remotePath.normalize("NFC").toLowerCase();
  const folders = saved.folders.filter((entry: { notebookId: string; path: string }) => !config.folders.some((folder) => matches(entry, folder)));
  for (const folder of config.folders) {
    const old = saved.folders.find((entry: { notebookId: string; path: string }) => matches(entry, folder));
    if (folders.some((entry: { path: string }) => entry.path?.normalize("NFC").toLowerCase() === folder.remotePath.normalize("NFC").toLowerCase())) throw new Error(t("remoteOccupied"));
    folders.push({ notebookId: folder.notebookId, name: folder.name, path: folder.remotePath,
      previousPaths: [...new Set([...(Array.isArray(old?.previousPaths) ? old.previousPaths : []), ...moves.filter((move) => move.notebookId === folder.notebookId).map((move) => move.from)])] });
  }
  folders.sort((a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path));
  return JSON.stringify({ version: 1, folders }, null, 2) + "\n";
}

export function assertGitLayoutTargets(names: string[], metadata: string | null, moves: GitLayoutMove[]) {
  const folders = metadata ? JSON.parse(metadata).folders : [];
  for (const move of moves) {
    if (!names.some((name) => name === move.to || name.startsWith(`${move.to}/`))) continue;
    if (!Array.isArray(folders) || !folders.some((folder: { notebookId: string; path: string; previousPaths?: string[] }) =>
      folder.path === move.to && folder.previousPaths?.includes(move.from))) {
      throw new Error(t("remoteExists", { path: move.to }));
    }
  }
}
