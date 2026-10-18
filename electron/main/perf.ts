/**
 * 启动与内存计时（仅当 `GOOSE_PERF_LOG` 指向文件时启用）。
 *
 * 不设环境变量时全部函数立即返回，不注册监听、不开定时器、不写盘，
 * 对正式运行的启动时间和内存没有可测量的影响。
 *
 * 输出是逐行 JSON（JSONL），由 `scripts/perf/startup.mjs` 汇总成 p50/p95。
 * 时间基准统一用 `process.getCreationTime()`（操作系统记录的进程创建时刻），
 * 这样主进程模块求值之前的那段 Chromium 引导也能算进去。
 */
import { app } from "electron";
import { appendFileSync } from "node:fs";

const logPath = process.env.GOOSE_PERF_LOG ?? "";
const exitAfterReport = process.env.GOOSE_PERF_EXIT === "1";
/** 首帧稳定后再等一会，让 GPU/渲染进程的内存读数稳定下来。 */
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
    // 性能日志不能影响应用本身。
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

/** 首帧探针的硬上限：超时就停，不让测量脚本挂死。 */
const FRAME_TIMEOUT_MS = 15000;

/**
 * 等渲染进程把界面真正画出来：
 * `#root` 有子节点 ≈ React 已提交，`data-startup-settling` 被移除 ≈ 双 rAF 后的首帧已稳定。
 * 两个信号分开记——它们的间隔就是"窗口已经出现但界面还没画完"的那段空白。
 */
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

/** 主要窗口创建前的准备耗时（语言包、菜单、窗口恢复）由调用方打点。 */
export function timeStartupPhase<T>(phase: string, run: () => T): T {
  if (!perfEnabled) return run();
  const began = Date.now() - creationTime;
  const result = run();
  write({ type: "phase", phase, began, ended: Date.now() - creationTime });
  return result;
}
