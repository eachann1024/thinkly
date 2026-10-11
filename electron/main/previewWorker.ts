import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MermaidPreviewRequest, MermaidPreviewReply } from "../../src/lib/preview-renderer/contract";

const root = path.dirname(fileURLToPath(import.meta.url));
let worker: BrowserWindow | null = null;
let opening: Promise<void> | null = null;
let nextId = 0;
const waiting = new Map<string, { cancelled: boolean }>();
const jobs = new Map<number, {
  resolve: (svg: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  owner: number;
  requestId?: string;
}>();

function closeWorker(reason = "预览渲染进程已关闭") {
  const old = worker;
  worker = null;
  opening = null;
  for (const job of jobs.values()) {
    clearTimeout(job.timer);
    job.reject(new Error(reason));
  }
  jobs.clear();
  if (old && !old.isDestroyed()) old.destroy();
}

function ensureWorker(): Promise<void> {
  if (opening) return opening;
  worker = new BrowserWindow({
    show: false, width: 1400, height: 1000,
    skipTaskbar: true, focusable: false,
    webPreferences: {
      preload: path.join(root, "../preload/previewWorker.cjs"),
      partition: "persist:goose-preview-worker",
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      spellcheck: false, backgroundThrottling: false,
    },
  });
  const current = worker;
  current.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  current.webContents.on("will-navigate", event => event.preventDefault());
  current.webContents.on("render-process-gone", () => {
    if (worker === current) closeWorker("预览渲染进程异常退出，请重试");
  });
  opening = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup(); reject(new Error("预览渲染进程启动超时")); closeWorker();
    }, 20000);
    const ready = (event: Electron.IpcMainEvent) => {
      if (event.sender !== current.webContents) return;
      cleanup(); resolve();
    };
    const cleanup = () => { clearTimeout(timer); ipcMain.removeListener("preview-worker:ready", ready); };
    ipcMain.on("preview-worker:ready", ready);
    const dev = process.env.ELECTRON_RENDERER_URL?.trim();
    const load = dev
      ? current.loadURL(new URL("preview-renderer.html", dev.endsWith("/") ? dev : dev + "/").href)
      : current.loadFile(path.join(root, "../renderer/preview-renderer.html"));
    void load.catch(error => { cleanup(); reject(error); if (worker === current) closeWorker(); });
    current.once("closed", () => {
      cleanup(); reject(new Error("预览渲染进程已关闭"));
      if (worker === current) closeWorker();
    });
  });
  return opening;
}

function validate(request: MermaidPreviewRequest) {
  const o = request?.options;
  if (request?.requestId !== undefined && (typeof request.requestId !== "string" || request.requestId.length > 100)) throw new Error("无效的预览请求标识");
  if (!request || typeof request.source !== "string" || request.source.length > 1024 * 1024 ||
      (request.context !== "editor" && request.context !== "export") ||
      !o || !["dark", "light"].includes(o.mode) ||
      (o.securityLevel !== undefined && !["strict", "loose", "antiscript"].includes(o.securityLevel)) ||
      (o.fontFamily !== undefined && (typeof o.fontFamily !== "string" || o.fontFamily.length > 4096)) ||
      (o.useMaxWidth !== undefined && typeof o.useMaxWidth !== "boolean") ||
      (request.fontIdentity !== undefined && (typeof request.fontIdentity !== "string" || request.fontIdentity.length > 65536))) {
    throw new Error("无效的图表预览请求");
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
      if (state.cancelled) throw new Error("预览任务已取消");
      if (event.sender.isDestroyed()) throw new Error("请求窗口已关闭");
      if (!worker || worker.isDestroyed()) throw new Error("预览渲染进程不可用");
      if (jobs.size >= 64) throw new Error("预览队列已满，请稍后重试");
      const id = ++nextId;
      const result = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => closeWorker("图表渲染超时，请检查源码后重试"), 45000);
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
      jobs.delete(id); clearTimeout(job.timer); job.reject(new Error("预览任务已取消"));
      if (worker && !worker.isDestroyed()) worker.webContents.send("preview-worker:cancel", id);
    }
  });
  ipcMain.on("preview-worker:reply", (event, reply: MermaidPreviewReply) => {
    if (!worker || event.sender !== worker.webContents || !reply || !Number.isInteger(reply.id)) return;
    const job = jobs.get(reply.id);
    if (!job) return;
    jobs.delete(reply.id); clearTimeout(job.timer);
    if (typeof reply.svg === "string" && reply.svg.length <= 8 * 1024 * 1024) job.resolve(reply.svg);
    else job.reject(new Error(typeof reply.error === "string" ? reply.error : "图表渲染失败"));
  });
  app.on("before-quit", () => closeWorker());
  app.on("browser-window-created", (_event, win) => {
    win.on("closed", () => {
      if (worker && !BrowserWindow.getAllWindows().some(candidate => candidate !== worker)) closeWorker();
    });
  });
}
