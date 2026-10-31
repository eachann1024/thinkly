import { dialog, type BrowserWindow, type OpenDialogOptions } from "electron";
import path from "node:path";
import { addSessionAllowed, assertAllowed, normalizeLocalOpenPath } from "./allowlist";
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
      defaultPath: folder,
      properties: ["openDirectory"],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) throw new Error(t("fileAccessCancelled"));
    const selected = normalizeLocalOpenPath(result.filePaths[0]!);
    if (!selected || !containsPath(selected, target)) throw new Error(t("fileAccessWrongFolder"));
    addSessionAllowed(selected);
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
