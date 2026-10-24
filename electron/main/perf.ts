import { app } from "electron";
import { appendFileSync } from "node:fs";

const logPath = process.env.GOOSE_PERF_LOG ?? "";
const exitAfterReport = process.env.GOOSE_PERF_EXIT === "1";
const SETTLE_MS = Number(process.env.GOOSE_PERF_SETTLE_MS ?? 1200);
const POLL_MS = 20;

export const perfEnabled = logPath !== "";

const creationTime = process.getCreationTime() ?? Date.now();

function write(record: Record<string, unknown>): void {
  try {
    appendFileSync(
      logPath,
      `${JSON.stringify({ ...record, at: Date.now() - creationTime })}\n`,
    );
  } catch {
  }
}

export function markStartup(phase: string, extra?: Record<string, unknown>): void {
  if (!perfEnabled) return;
  write({ type: "phase", phase, ...extra });
}

type Pollable = {
  isDestroyed: () => boolean;
  executeJavaScript: (code: string) => Promise<unknown>;
  on: (event: string, listener: (...args: never[]) => void) => void;
};

const PROBE = `(() => ({
  settling: document.documentElement.hasAttribute('data-startup-settling'),
  rendered: (document.getElementById('root')?.childElementCount ?? 0) > 0,
}))()`;

const FRAME_TIMEOUT_MS = 15000;

function watchFirstFrame(kind: string, contents: Pollable): void {
  const startedAt = Date.now();
  let rendered = false;
  let frame = false;
  const finish = () => {
    if (frame) return;
    frame = true;
    markStartup(`first-stable-frame:${kind}`);
    scheduleMemoryReport();
  };
  const poll = () => {
    if (frame) return;
    if (contents.isDestroyed()) {
      markStartup(`window-destroyed:${kind}`);
      return;
    }
    if (Date.now() - startedAt > FRAME_TIMEOUT_MS) {
      markStartup(`frame-timeout:${kind}`, { rendered });
      markStartup(`first-stable-frame:${kind}`, { timedOut: true });
      scheduleMemoryReport();
      return;
    }
    contents
      .executeJavaScript(PROBE)
      .then((result) => {
        const state = result as { settling: boolean; rendered: boolean };
        if (state.rendered && !rendered) {
          rendered = true;
          markStartup(`renderer-rendered:${kind}`);
        }
        if (state.rendered && !state.settling) {
          finish();
          return;
        }
        setTimeout(poll, POLL_MS);
      })
      .catch(() => setTimeout(poll, POLL_MS));
  };
  setTimeout(poll, POLL_MS);
}

let memoryReported = false;

function scheduleMemoryReport(): void {
  if (!perfEnabled || memoryReported) return;
  memoryReported = true;
  const sample = () => {
    const metrics = app.getAppMetrics().map((metric) => ({
      type: metric.type,
      memoryKB: metric.memory?.workingSetSize ?? 0,
      peakKB: metric.memory?.peakWorkingSetSize ?? 0,
    }));
    const workingSetKB = metrics.reduce((sum, metric) => sum + metric.memoryKB, 0);
    write({ type: "memory", processes: metrics, workingSetKB });
    if (exitAfterReport) {
      app.exit(0);
    }
  };
  setTimeout(sample, SETTLE_MS);
}

export function installPerfInstrumentation(): void {
  if (!perfEnabled) return;
  markStartup("main-module");
  app.once("ready", () => markStartup("app-ready"));
  app.on("browser-window-created", (_event, win) => {
    win.once("ready-to-show", () => markStartup("ready-to-show:workspace"));
    win.once("show", () => markStartup("window-shown:workspace"));
  });
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "window") return;
    const kind = "workspace";
    markStartup(`web-contents:${kind}`);
    contents.on("dom-ready", () => markStartup(`dom-ready:${kind}`));
    contents.on("did-finish-load", () => {
      markStartup(`did-finish-load:${kind}`);
      watchFirstFrame(kind, contents);
    });
  });
}

export function timeStartupPhase<T>(phase: string, run: () => T): T {
  if (!perfEnabled) return run();
  const began = Date.now() - creationTime;
  const result = run();
  write({ type: "phase", phase, began, ended: Date.now() - creationTime });
  return result;
}
