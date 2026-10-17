import { t } from "./i18n/preview";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MermaidPreviewRequest, MermaidPreviewReply } from "../../src/lib/preview-renderer/contract";

import { previewWorkerTransition, type PreviewWorkerState } from "./previewWorkerState";

const root = path.dirname(fileURLToPath(import.meta.url));
let lifecycle: PreviewWorkerState<BrowserWindow> = { status: "closed" };
const getWorker = () => lifecycle.status === "closed" ? null : lifecycle.worker;
let nextId = 0;
const waiting = new Map<string, { cancelled: boolean }>();
const jobs = new Map<number, {
  resolve: (svg: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  owner: number;
  requestId?: string;
}>();

function closeWorker(reason = t("closed")) {
  const old = getWorker();
  lifecycle = previewWorkerTransition(lifecycle, { type: "close" });
  for (const job of jobs.values()) {
    clearTimeout(job.timer);
    job.reject(new Error(reason));
  }
  jobs.clear();
  if (old && !old.isDestroyed()) old.destroy();
}

function ensureWorker(): Promise<void> {
  if (lifecycle.status === "opening") return lifecycle.opening;
  if (lifecycle.status === "ready" && !lifecycle.worker.isDestroyed()) return Promise.resolve();
  if (lifecycle.status !== "closed") closeWorker();
  const current = new BrowserWindow({
    show: false, width: 1400, height: 1000,
    skipTaskbar: true, focusable: false,
    webPreferences: {
      preload: path.join(root, "../preload/previewWorker.cjs"),
      partition: "persist:goose-preview-worker",
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      spellcheck: false, backgroundThrottling: false,
    },
  });
  current.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  current.webContents.on("will-navigate", event => event.preventDefault());
  current.webContents.on("render-process-gone", () => {
    if (getWorker() === current) closeWorker(t("crashed"));
  });
  const opening = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup(); reject(new Error(t("startTimeout"))); closeWorker();
    }, 20000);
    const ready = (event: Electron.IpcMainEvent) => {
      if (event.sender !== current.webContents) return;
      cleanup();
      if (getWorker() !== current) { reject(new Error(t("closed"))); return; }
      lifecycle = previewWorkerTransition(lifecycle, { type: "ready", worker: current });
      resolve();
    };
    const cleanup = () => { clearTimeout(timer); ipcMain.removeListener("preview-worker:ready", ready); };
    ipcMain.on("preview-worker:ready", ready);
    const dev = process.env.ELECTRON_RENDERER_URL?.trim();
    const load = dev
      ? current.loadURL(new URL("preview-renderer.html", dev.endsWith("/") ? dev : dev + "/").href)
      : current.loadFile(path.join(root, "../renderer/preview-renderer.html"));
    void load.catch(error => { cleanup(); reject(error); if (getWorker() === current) closeWorker(); });
    current.once("closed", () => {
      cleanup(); reject(new Error(t("closed")));
      if (getWorker() === current) closeWorker();
    });
  });
  lifecycle = previewWorkerTransition(lifecycle, { type: "open", worker: current, opening });
  return opening;
}

function validate(request: MermaidPreviewRequest) {
  const o = request?.options;
  if (request?.requestId !== undefined && (typeof request.requestId !== "string" || request.requestId.length > 100)) throw new Error(t("invalidId"));
  if (!request || typeof request.source !== "string" || request.source.length > 1024 * 1024 ||
      (request.context !== "editor" && request.context !== "export") ||
      !o || !["dark", "light"].includes(o.mode) ||
      (o.securityLevel !== undefined && !["strict", "loose", "antiscript"].includes(o.securityLevel)) ||
      (o.fontFamily !== undefined && (typeof o.fontFamily !== "string" || o.fontFamily.length > 4096)) ||
      (o.useMaxWidth !== undefined && typeof o.useMaxWidth !== "boolean") ||
      (request.fontIdentity !== undefined && (typeof request.fontIdentity !== "string" || request.fontIdentity.length > 65536))) {
    throw new Error(t("invalidRequest"));
  }
}

export function registerPreviewWorkerIpc() {
  ipcMain.handle("desktop:renderMermaidPreview", async (event, request: MermaidPreviewRequest) => {
    validate(request);
    const token = `${event.sender.id}:${request.requestId ?? ++nextId}`;
    const state = { cancelled: false };
    waiting.set(token, state);
    try {
      await ensureWorker();
      if (state.cancelled) throw new Error(t("cancelled"));
      if (event.sender.isDestroyed()) throw new Error(t("windowClosed"));
      const worker = getWorker();
      if (!worker || worker.isDestroyed()) throw new Error(t("unavailable"));
      if (jobs.size >= 64) throw new Error(t("queueFull"));
      const id = ++nextId;
      const result = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => closeWorker(t("renderTimeout")), 45000);
        jobs.set(id, { resolve, reject, timer, owner: event.sender.id, requestId: request.requestId });
      });
      worker.webContents.send("preview-worker:request", { ...request, id });
      return await result;
    } finally { waiting.delete(token); }
  });
  ipcMain.on("desktop:cancelMermaidPreview", (event, requestId: string) => {
    if (typeof requestId !== "string" || requestId.length > 100) return;
    const state = waiting.get(`${event.sender.id}:${requestId}`);
    if (state) state.cancelled = true;
    for (const [id, job] of jobs) {
      if (job.owner !== event.sender.id || job.requestId !== requestId) continue;
      jobs.delete(id); clearTimeout(job.timer); job.reject(new Error(t("cancelled")));
      const worker = getWorker();
      if (worker && !worker.isDestroyed()) worker.webContents.send("preview-worker:cancel", id);
    }
  });
  ipcMain.on("preview-worker:reply", (event, reply: MermaidPreviewReply) => {
    const worker = getWorker();
    if (!worker || event.sender !== worker.webContents || !reply || !Number.isInteger(reply.id)) return;
    const job = jobs.get(reply.id);
    if (!job) return;
    jobs.delete(reply.id); clearTimeout(job.timer);
    if (typeof reply.svg === "string" && reply.svg.length <= 8 * 1024 * 1024) job.resolve(reply.svg);
    else job.reject(new Error(typeof reply.error === "string" ? reply.error : t("renderFailed")));
  });
  app.on("before-quit", () => closeWorker());
  app.on("browser-window-created", (_event, win) => {
    win.on("closed", () => {
      const worker = getWorker();
      if (worker && !BrowserWindow.getAllWindows().some(candidate => candidate !== worker)) closeWorker();
    });
  });
}
