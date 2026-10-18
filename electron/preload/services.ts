import type { GitSyncBridge } from "../../src/lib/git-sync-contract";
import type {
  AssetMaintenanceBridge,
  AssetWorkspaceSnapshot,
} from "../../src/lib/asset-maintenance-contract";
import { ipcRenderer } from "electron";

export const invoke = (channel: string, ...args: unknown[]) =>
  ipcRenderer.invoke(channel, ...args);

export const assetMaintenance: AssetMaintenanceBridge = {
  open: () => invoke("asset-maintenance:open"),
  appearance: () => invoke("asset-maintenance:appearance"),
  notebooks: () => invoke("asset-maintenance:notebooks"),
  scan: (notebookId) => invoke("asset-maintenance:scan", notebookId),
  trash: (token, paths) => invoke("asset-maintenance:trash", token, paths),
  onSnapshotRequest: (callback) => {
    const listener = (_event: unknown, requestId: string) =>
      callback(requestId);
    ipcRenderer.on("asset-maintenance:snapshot-request", listener);
    return () =>
      ipcRenderer.removeListener(
        "asset-maintenance:snapshot-request",
        listener,
      );
  },
  replySnapshot: (requestId: string, snapshot: AssetWorkspaceSnapshot | null) =>
    ipcRenderer.send("asset-maintenance:snapshot-reply", requestId, snapshot),
};

export const gitSync: GitSyncBridge = {
  gitAvailable: () => invoke("git-sync:available"),
  setModuleEnabled: (enabled) => invoke("git-sync:set-module", enabled),
  getState: () => invoke("git-sync:state"),
  checkFolder: (localPath) => invoke("git-sync:check-folder", localPath),
  rememberNotebookRoot: (localPath) => invoke("git-sync:remember-root", localPath),
  save: (config) => invoke("git-sync:save", config),
  remove: (notebookId) => invoke("git-sync:remove", notebookId),
  syncNow: (notebookId) => invoke("git-sync:now", notebookId),
  rebindFolder: (request) => invoke("git-sync:rebind", request),
  renameNotebookFolder: (request) => invoke("git-sync:rename-folder", request),
  adoptRenamedNotebookFolder: (request) => invoke("git-sync:adopt-folder", request),
  getConflict: (repositoryId, conflictId) => invoke("git-sync:conflict", { repositoryId, conflictId }),
  resolveConflict: (request) => invoke("git-sync:resolve-conflict", request),
  onState: (callback) => {
    const listener = (_event: unknown, state: Parameters<typeof callback>[0]) =>
      callback(state);
    ipcRenderer.on("git-sync:state", listener);
    return () => ipcRenderer.removeListener("git-sync:state", listener);
  },
  onPrepare: (callback) => {
    const listener = (
      _event: unknown,
      requestId: string,
      localPaths: string[],
    ) => callback(requestId, localPaths);
    ipcRenderer.on("git-sync:prepare", listener);
    return () => ipcRenderer.removeListener("git-sync:prepare", listener);
  },
  replyPrepare: (requestId, error) =>
    ipcRenderer.send("git-sync:prepare-reply", requestId, error),
  onFinish: (callback) => {
    const listener = (_event: unknown, requestId: string) =>
      callback(requestId);
    ipcRenderer.on("git-sync:finish", listener);
    return () => ipcRenderer.removeListener("git-sync:finish", listener);
  },
};

export const web = {
  search: (query: string, limit?: number) =>
    invoke("desktop:web-search", query, limit) as Promise<{ engine: string; results: { title: string; url: string; snippet: string }[] }>,
  read: (url: string) =>
    invoke("desktop:web-read", url) as Promise<{ url: string; title: string; content: string }>,
  json: (url: string) => invoke("desktop:web-json", url) as Promise<unknown>,
};
