import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { comparisonLocalPath, localPathsAreCaseInsensitive } from "../../src/lib/canonicalLocalPath";
import type { GitNotebookFolderAdopt } from "../../src/lib/git-sync-contract";
import { assertAllowed } from "./allowlist";
import { finishNotebookRenameIntent, type NotebookRetargetContext } from "./gitSyncRetarget";
import { writeNotebookRenameIntent } from "./gitSyncRenameIntent";

const pathKey = (value: string) => comparisonLocalPath(value, localPathsAreCaseInsensitive()).replace(/\/+$/, "");

function overlaps(left: string, right: string): boolean {
  const x = pathKey(left);
  const y = pathKey(right);
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

async function matchingSibling(notebookId: string, previous: string): Promise<string | null> {
  const parent = path.dirname(previous);
  const matches: string[] = [];
  for (const entry of await readdir(parent, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const candidate = path.join(parent, entry.name);
    if (pathKey(candidate) === pathKey(previous)) continue;
    let info;
    try { info = await lstat(candidate); } catch { continue; }
    if (!info.isDirectory() || info.isSymbolicLink()) continue;
    let id = "";
    try { id = JSON.parse(await readFile(path.join(candidate, ".goose", "notebook.json"), "utf8")).id; } catch { continue; }
    if (id === notebookId) matches.push(candidate);
  }
  return matches.length === 1 ? matches[0]! : null;
}

export async function adoptRenamedNotebookFolder(request: GitNotebookFolderAdopt, context: NotebookRetargetContext): Promise<{ localPath: string; name: string } | null> {
  if (!request || typeof request.notebookId !== "string" || typeof request.previousLocalPath !== "string" || !Array.isArray(request.occupiedPaths)) return null;
  const previous = assertAllowed(request.previousLocalPath);
  const next = await matchingSibling(request.notebookId, previous).catch(() => null);
  if (!next || request.occupiedPaths.some((occupied) => typeof occupied === "string" && overlaps(occupied, next))) return null;
  const name = path.basename(next);
  const intent = { notebookId: request.notebookId, previous, next, name };
  await writeNotebookRenameIntent(context.userData, intent);
  await finishNotebookRenameIntent(context, intent);
  return { localPath: next, name };
}
