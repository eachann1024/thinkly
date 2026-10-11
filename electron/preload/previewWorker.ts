import { contextBridge, ipcRenderer } from "electron";
import type { PreviewWorkerBridge } from "../../src/lib/preview-renderer/contract";

const bridge: PreviewWorkerBridge = {
  onRequest(callback) {
    ipcRenderer.on("preview-worker:request", (_event, job) => callback(job));
  },
  onCancel(callback) { ipcRenderer.on("preview-worker:cancel", (_event, id) => callback(id)); },
  reply: (result) => ipcRenderer.send("preview-worker:reply", result),
  ready: () => ipcRenderer.send("preview-worker:ready"),
};
contextBridge.exposeInMainWorld("goosePreviewWorker", bridge);
