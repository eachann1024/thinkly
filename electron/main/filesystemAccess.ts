import { dialog, type BrowserWindow, type OpenDialogOptions } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { addGrantedFolder, assertAllowed, listVaultRoots, normalizeLocalOpenPath } from "./allowlist";
import { withQueuedWindowDialog } from "./dialogSession";
import { t } from "./i18n/nativeServices";

const pendingRequests = new Map<string, Promise<void>>();
const failedRequests = new Map<string, { revision: number; error: unknown }>();
const failedScopes = new Map<string, unknown>();
let requestQueue: Promise<void> = Promise.resolve();
let accessRevision = 0;

function permissionDenied(error: unknown) {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "EACCES" || code === "EPERM" ||
    (error instanceof Error && error.message === t("outsideAllowed"));
}

function containsPath(directory: string, target: string) {
  const insensitive = process.platform === "win32" || process.platform === "darwin";
  const relative = path.relative(insensitive ? directory.toLowerCase() : directory,
    insensitive ? target.toLowerCase() : target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function commonAncestor(a: string, b: string) {
  const left = a.split(path.sep);
  const right = b.split(path.sep);
  const insensitive = process.platform === "win32" || process.platform === "darwin";
  let index = 0;
  while (index < left.length && index < right.length &&
    (insensitive ? left[index]!.toLowerCase() === right[index]!.toLowerCase() : left[index] === right[index])) index += 1;
  return left.slice(0, index).join(path.sep) || path.sep;
}

/** Open the prompt at the closest folder shared with an added notebook, e.g. the parent of the file list. */
function suggestedFolder(target: string, fallback: string) {
  let best: string | null = null;
  for (const root of listVaultRoots()) {
    const shared = commonAncestor(root, target);
    if (shared !== path.sep && shared !== path.parse(target).root && (!best || shared.length > best.length)) best = shared;
  }
  let folder = best ?? fallback;
  while (!existsSync(folder) && path.dirname(folder) !== folder) folder = path.dirname(folder);
  return folder;
}

function missingTarget(target: string) {
  return Object.assign(new Error(`ENOENT: no such file or directory, '${target}'`), { code: "ENOENT", path: target });
}

async function requestAccess(owner: BrowserWindow | null, target: string, directory: boolean,
  revision: number, probe: () => Promise<unknown>, accessRequestId?: string) {
  const folder = directory ? target : path.dirname(target);
  const key = folder;
  const existing = pendingRequests.get(key);
  if (existing) return existing;
  const pending = requestQueue.then(() => withQueuedWindowDialog(owner, async (win) => {
    if (accessRequestId && failedScopes.has(accessRequestId)) throw failedScopes.get(accessRequestId);
    const failure = failedRequests.get(key);
    if (failure && failure.revision > revision) throw failure.error;
    if (accessRevision !== revision) {
      try { await probe(); return; }
      catch (error) { if (!permissionDenied(error)) throw error; }
    }
    const options: OpenDialogOptions = {
      title: t("requestFileAccess"),
      message: t("requestFileAccessMessage", { path: target }),
      buttonLabel: t("grantFileAccess"),
      defaultPath: suggestedFolder(target, folder),
      properties: ["openDirectory"],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) throw new Error(t("fileAccessCancelled"));
    const selected = normalizeLocalOpenPath(result.filePaths[0]!);
    if (!selected || !containsPath(selected, target)) throw new Error(t("fileAccessWrongFolder"));
    addGrantedFolder(selected);
    failedRequests.delete(key);
    accessRevision += 1;
  }));
  pendingRequests.set(key, pending);
  requestQueue = pending.catch(() => {});
  try { await pending; }
  catch (error) {
    failedRequests.set(key, { revision: ++accessRevision, error });
    throw error;
  }
  finally { pendingRequests.delete(key); }
}

/** Keep the caller pending until the native permission request has resolved. */
export async function withFilesystemAccess<T>(
  owner: BrowserWindow | null,
  requestedPath: string,
  directory: boolean,
  operation: (target: string) => Promise<T>,
  accessRequestId?: string,
): Promise<T> {
  const target = typeof requestedPath === "string" ? normalizeLocalOpenPath(requestedPath) : null;
  if (!target) throw new Error(t("parentPath"));
  const execute = () => operation(assertAllowed(target));
  const revision = accessRevision;
  try { return await execute(); }
  catch (error) {
    if (!permissionDenied(error)) throw error;
    // Asking for access to a path that does not exist only produces a pointless prompt.
    if (!existsSync(target)) throw missingTarget(target);
    try {
      await requestAccess(owner, target, directory, revision, execute, accessRequestId);
      return await execute();
    }
    catch (retryError) {
      const detail = retryError instanceof Error ? retryError.message : String(retryError);
      const failure = permissionDenied(retryError)
        ? new Error(t("fileAccessStillDenied", { reason: detail })) : retryError;
      if (accessRequestId) failedScopes.set(accessRequestId, failure);
      throw failure;
    }
  }
}
