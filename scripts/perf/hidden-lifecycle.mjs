#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { snapshotSource } from "./hidden-lifecycle-snapshot.mjs";

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), "../..");
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const causes = process.argv.includes("--causes") || process.env.THINKLY_DIAG_CAUSES === "1";
const promote = process.argv.includes("--promote") || process.env.THINKLY_DIAG_PROMOTE === "1";
const schedulerProbe = process.argv.includes("--scheduler-probe") || process.env.THINKLY_DIAG_SCHEDULER_PROBE === "1";
const baselineRenderer = arg("baseline-renderer", process.env.THINKLY_DIAG_BASELINE_RENDERER);
const boundaryNames = new Set([
  "goose-dm-main-drift", "goose-dm-small-drift", "goose-dm-corner-drift", "goose-dm-breathe", "goose-dm-ripple",
  "goose-dm-glint", "goose-dm-flow", "goose-dm-wave", "goose-dm-progress", "goose-cs-float-lg", "goose-cs-float-sm",
  "goose-cs-blink", "goose-cs-blink-open", "goose-cs-blink-twice", "goose-cs-blink-twice-open",
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!process.versions.electron) {
  const renderer = path.join(root, "dist-electron/renderer/index.html");
  if (!existsSync(renderer)) throw new Error("缺少现有 renderer 构建产物");
  const defaultReport = schedulerProbe ? "thinkly-dot-scheduler-probe.json" : promote ? "thinkly-dot-promote.json" : causes ? "thinkly-dot-causes.json" : "thinkly-dot-cpu.json";
  const report = path.resolve(arg("json", path.join(tmpdir(), defaultReport)));
  const binary = createRequire(import.meta.url)("electron");
  const profile = mkdtempSync(path.join(tmpdir(), "thinkly-hidden-lifecycle-"));
  const runId = path.basename(profile);
  const env = { ...process.env, THINKLY_DIAG_PROFILE: profile, THINKLY_DIAG_REPORT: report, THINKLY_DIAG_ID: runId, THINKLY_DIAG_CAUSES: causes ? "1" : "0", THINKLY_DIAG_PROMOTE: promote ? "1" : "0", THINKLY_DIAG_BASELINE_RENDERER: baselineRenderer || "", THINKLY_DIAG_SCHEDULER_PROBE: schedulerProbe ? "1" : "0" };
  delete env.ELECTRON_RUN_AS_NODE;
  let child;
  try {
    child = spawn(binary, [self], { env, stdio: ["ignore", "inherit", "inherit"] });
    const watchdog = setTimeout(() => child.kill("SIGKILL"), 190000);
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", resolve);
    }).finally(() => clearTimeout(watchdog));
    if (code !== 0) throw new Error(`隔离 Electron 退出：${code}`);
    const result = JSON.parse(readFileSync(report, "utf8"));
    if (result.runId !== runId || result.phases?.length !== (schedulerProbe ? 2 : 4)) throw new Error("拒绝读取陈旧或未完成的诊断报告");
    console.log(JSON.stringify({ report, rendererHash: result.rendererHash, cssHashes: result.cssHashes,
      errors: result.errors, comparison: result.comparison,
      phases: result.phases.map((phase) => ({
        variant: phase.variant, seconds: phase.elapsedSeconds,
        visibility: phase.after.renderer.visibility, nativeVisible: phase.after.nativeVisible,
        animations: phase.after.renderer.animationStates, dots: phase.after.renderer.dots.length,
        pausedDots: phase.after.renderer.dots.filter((dot) => dot.paused).length,
        cpu: phase.cpu, perfDelta: phase.perfDelta,
      })),
    }, null, 2));
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  }
} else {
  void runElectronDiagnostic();
}

async function runElectronDiagnostic() {
  const { app, BrowserWindow, session } = await import("electron");
  const { createHash } = await import("node:crypto");
  const profile = process.env.THINKLY_DIAG_PROFILE;
  if (!profile?.startsWith(path.join(tmpdir(), "thinkly-hidden-lifecycle-"))) {
    throw new Error("拒绝使用非临时诊断 profile");
  }
  const sessionPath = path.join(profile, "session");
  mkdirSync(sessionPath, { recursive: true });
  app.setPath("userData", profile);
  app.setPath("sessionData", sessionPath);
  app.setName("Thinkly Lifecycle Diagnostic");
  let win;
  const errors = [];
  const metrics = () => app.getAppMetrics().map(({ pid, type, cpu }) => ({ pid, type, ...cpu }));
  const snapshot = async () => ({
    nativeVisible: win.isVisible(), minimized: win.isMinimized(), nativeFocused: win.isFocused(),
    backgroundThrottling: win.webContents.backgroundThrottling, zoomFactor: win.webContents.getZoomFactor(),
    renderer: await win.webContents.executeJavaScript(snapshotSource),
  });
  const performanceMetrics = async () => {
    const result = await win.webContents.debugger.sendCommand("Performance.getMetrics");
    const values = Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));
    for (const name of ["RecalcStyleCount", "LayoutCount", "RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration"]) {
      if (!Number.isFinite(values[name])) throw new Error(`缺失有效CDP指标：${name}`);
    } return values;
  };
  const bounded = (stage, run) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`初始化超时：${stage}`)), 10000);
    run().then(resolve, reject).finally(() => clearTimeout(timer));
  });
  try {
    console.log("隔离诊断：等待 Electron ready");
    await app.whenReady();
    app.dock?.hide();
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !/^(file|data|blob):/.test(details.url) });
    });
    win = new BrowserWindow({
      show: false, width: 1280, height: 900, paintWhenInitiallyHidden: true,
      webPreferences: { backgroundThrottling: true, contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.webContents.on("console-message", (event) => {
      if (event.level === "error") errors.push(event.message);
    });
    win.webContents.on("render-process-gone", (_event, details) => errors.push(`renderer gone: ${details.reason}`));
    await bounded("empty data document", () => win.loadURL("data:text/html,<!doctype html><title>Thinkly isolated diagnostic</title>"));
    win.webContents.debugger.attach("1.3");
    await bounded("Page.enable", () => win.webContents.debugger.sendCommand("Page.enable"));
    console.log("隔离诊断：CDP文档目标已就绪");
    const renderer = path.join(root, "dist-electron/renderer/index.html");
    const html = readFileSync(renderer);
    const renderers = { before: baselineRenderer ? path.join(path.resolve(baselineRenderer), "index.html") : renderer, after: renderer };
    const artifact = (entry) => {
      const hash = createHash("sha256"); let files = 0;
      const visit = (directory) => { for (const item of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(directory, item.name);
        if (item.isDirectory()) visit(file); else if (item.isFile()) { files++; hash.update(path.relative(path.dirname(entry), file)); hash.update("\0"); hash.update(readFileSync(file)); }
      } }; visit(path.dirname(entry));
      return { entry, htmlHash: createHash("sha256").update(readFileSync(entry)).digest("hex"), treeHash: hash.digest("hex"), files };
    };
    const rendererArtifacts = Object.fromEntries(Object.entries(renderers).map(([variant, entry]) => [variant, artifact(entry)]));
    if (baselineRenderer && rendererArtifacts.before.treeHash === rendererArtifacts.after.treeHash) throw new Error("old/new renderer 完全一致，拒绝伪造 JS 对照");
    const cssPath = path.join(root, "src/components/ui/dot-matrix/dot-matrix.css");
    const afterCSS = readFileSync(cssPath, "utf8");
    const marker = "--dm-loop-ease: steps(2, end)";
    if (afterCSS.split(marker).length !== 2) throw new Error("源码缺少唯一低频循环标记，拒绝伪造对照");
    const beforeCSS = afterCSS.replace(marker, "--dm-loop-ease: var(--dm-ease)");
    const cssHashes = Object.fromEntries(Object.entries({ before: beforeCSS, after: afterCSS })
      .map(([variant, css]) => [variant, createHash("sha256").update(css).digest("hex")]));
    const loadRenderer = async (entry) => {
      if (!win.webContents.debugger.isAttached()) win.webContents.debugger.attach("1.3");
      const seeded = await bounded("seed random before document", () => win.webContents.debugger.sendCommand("Page.addScriptToEvaluateOnNewDocument", {
        source: "{ let seed = 0x54686e6b; window.__thinklyDiagRandom = 'LCG32:0x54686e6b'; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }",
      }));
      try { await bounded("load renderer", () => win.loadFile(entry)); }
      finally { await bounded("remove seed registration", () => win.webContents.debugger.sendCommand("Page.removeScriptToEvaluateOnNewDocument", { identifier: seeded.identifier })); }
      await win.webContents.debugger.sendCommand("Performance.enable");
      await win.webContents.executeJavaScript(`{
        window.__thinklyDiagVisibility = [{ at: performance.now(), state: document.visibilityState }];
        document.addEventListener('visibilitychange', () => window.__thinklyDiagVisibility.push({ at: performance.now(), state: document.visibilityState }));
      }`);
      await sleep(3000);
    };
    if (!baselineRenderer) await loadRenderer(renderer);
    const schedulerJS = schedulerProbe ? createRequire(import.meta.url)("esbuild").buildSync({
      entryPoints: [path.join(root, "src/components/ui/dot-matrix/dotLoopScheduler.ts")], bundle: true,
      format: "iife", globalName: "ThinklyDotProbe", platform: "browser", write: false,
    }).outputFiles[0].text : "";
    const phases = [];
    const assertActive = (state, variant, pauseGroup, manual = false) => {
      const expected = variant === "before" ? "cubic-bezier(0.45, 0, 0.55, 1)" : "steps(2)";
      const loops = state.renderer.animationTimes.filter((item) => item.name.startsWith("goose-dm-")
        && !["goose-dm-enter", "goose-dm-shake"].includes(item.name));
      if (!loops.length || !loops.every((item) => item.easing?.includes(expected))) {
        throw new Error(`${variant} 未施加预期循环曲线，拒绝采样`);
      }
      if (state.renderer.randomFixture !== "LCG32:0x54686e6b" || state.nativeVisible || state.renderer.hidden || state.renderer.visibility !== "visible" || !state.backgroundThrottling
        || !state.renderer.animations || state.renderer.animationTimes.length !== state.renderer.animations
        || state.renderer.dots.some((dot) => dot.paused || dot.phase !== "in" || dot.display === "none" || dot.width <= 0 || dot.height <= 0 || !dot.inViewport)) {
        throw new Error("fixture 不是文档可见且消费者仍展示的隐藏原生窗口");
      }
      for (const animation of state.renderer.animationTimes) {
        const paused = pauseGroup === "all" || pauseGroup === animation.group
          || (manual && boundaryNames.has(animation.name) && (manual !== "dot" || animation.group === "dot"));
        if (animation.state !== (paused ? "paused" : "running") || animation.playbackRate !== 1) throw new Error(`动画状态不符：${animation.name}`);
      }
      if (manual && baselineRenderer && state.renderer.dots.some(dot => dot.clock !== "boundary")) throw new Error("新bundle未接入boundary时钟");
    };
    const cases = schedulerProbe ? ["none", "scheduler"] : promote ? ["none", "promote", "none", "promote"] : causes ? ["none", "dot", "character", "all"] : ["before", "after", "before", "after"];
    for (const phaseCase of cases) {
      const variant = causes || promote || schedulerProbe ? "after" : phaseCase;
      if (baselineRenderer) await loadRenderer(renderers[variant]);
      const pauseGroup = causes ? phaseCase : "none";
      const promotion = promote && phaseCase === "promote" ? "\n.goose-dm,.goose-dm :is(.goose-dm-breathe,.goose-dm-ripple,.goose-dm-glint,.goose-dm-flow,.goose-dm-wave,.goose-dm-progress,.goose-dm-alert){will-change:transform,opacity}" : "";
      const selector = pauseGroup === "dot" ? ".goose-dm,.goose-dm *" : pauseGroup === "character" ? ".goose-cs,.goose-cs *" : ".goose-dm,.goose-dm *,.goose-cs,.goose-cs *";
      const css = (variant === "before" ? beforeCSS : afterCSS) + promotion + (pauseGroup === "none" ? "" : `\n${selector}{animation-play-state:paused!important}`);
      await win.webContents.executeJavaScript(`{
        document.getElementById('thinkly-cpu-diagnostic-style')?.remove();
        const style = document.createElement('style');
        style.id = 'thinkly-cpu-diagnostic-style';
        style.textContent = ${JSON.stringify(css)};
        document.head.append(style);
      }`);
      if (phaseCase === "scheduler") await win.webContents.executeJavaScript(`${schedulerJS};
        document.querySelectorAll('svg.goose-dm').forEach(el => ThinklyDotProbe.resumeDotLoops(el));`);
      try {
        await sleep(1500);
        const before = await snapshot();
        assertActive(before, variant, pauseGroup, (baselineRenderer && variant === "after") || (phaseCase === "scheduler" && "dot"));
        const perfBefore = await performanceMetrics();
        const initial = metrics();
        const started = performance.now();
        console.log(`隔离诊断：第${phases.length + 1}轮 ${variant} 开始CPU采样`);
        const durationMs = causes || promote || schedulerProbe ? 6000 : 32000;
        const samples = [];
        const sampleOffsetsMs = durationMs >= 32000 ? [5000, 12500, 20500, 28000] : [];
        for (const targetMs of sampleOffsetsMs) {
          await sleep(Math.max(0, targetMs - (performance.now() - started)));
          const sample = await snapshot();
          assertActive(sample, variant, pauseGroup, (baselineRenderer && variant === "after") || (phaseCase === "scheduler" && "dot"));
          samples.push(sample);
        }
        while (performance.now() - started < durationMs) await sleep(Math.max(1, Math.ceil(durationMs - (performance.now() - started))));
        const elapsedSeconds = (performance.now() - started) / 1000;
        const final = metrics();
        const after = await snapshot();
        assertActive(after, variant, pauseGroup, (baselineRenderer && variant === "after") || (phaseCase === "scheduler" && "dot"));
        if (JSON.stringify(before.renderer.geometry) !== JSON.stringify(after.renderer.geometry)) {
          throw new Error("采样期间点阵几何发生变化");
        }
        if (phases.length && JSON.stringify(phases[0].before.renderer.geometry) !== JSON.stringify(before.renderer.geometry)) throw new Error("交错各轮fixture几何不一致");
        const perfAfter = await performanceMetrics();
        const visualSamples = [];
        if (durationMs >= 32000) for (let index = 0; index < 4; index++) {
          await sleep(1100);
          const visual = await snapshot();
          assertActive(visual, variant, pauseGroup, baselineRenderer && variant === "after");
          visualSamples.push(visual);
        }
        const cpu = final.map((metric) => {
          const prior = initial.find((item) => item.pid === metric.pid);
          const delta = prior && typeof metric.cumulativeCPUUsage === "number" && typeof prior.cumulativeCPUUsage === "number"
            ? metric.cumulativeCPUUsage - prior.cumulativeCPUUsage : null;
          if (delta !== null && (!Number.isFinite(delta) || delta < 0)) throw new Error("CPU累积计数无效");
          return { pid: metric.pid, type: metric.type, cpuSeconds: delta,
            coreEquivalentPercent: delta === null ? null : delta / elapsedSeconds * 100 };
        });
        const perfDelta = Object.fromEntries(["RecalcStyleCount", "LayoutCount", "RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration"]
          .map((name) => [name, (perfAfter[name] || 0) - (perfBefore[name] || 0)]));
        phases.push({ variant, schedulerProbe: phaseCase === "scheduler", rendererArtifact: rendererArtifacts[variant], pauseGroup, promotion: !!promotion, elapsedSeconds, sampleOffsetsMs, before, samples, after,
          visualSampleIntervalMs: 1100, visualSamplesExcludedFromCpu: true, visualSamples, cpu, perfDelta });
        console.log(JSON.stringify({ phase: phases.length, variant, schedulerProbe: phaseCase === "scheduler", pauseGroup, promotion: !!promotion, elapsedSeconds, states: after.renderer.animationStates, cpu, perfDelta }));
      } finally {
        await win.webContents.executeJavaScript("document.getElementById('thinkly-cpu-diagnostic-style')?.remove()");
      }
    }
    const comparison = causes || promote || schedulerProbe ? null : Object.fromEntries(["GPU", "Tab"].map((type) => {
      const averages = Object.fromEntries(["before", "after"].map((variant) => {
        const selected = phases.filter((phase) => phase.variant === variant);
        const readings = selected.flatMap((phase) => phase.cpu.filter((metric) => metric.type === type));
        const seconds = selected.reduce((sum, phase) => sum + phase.elapsedSeconds, 0);
        const percent = readings.length === 2 && readings.every((metric) => metric.cpuSeconds !== null)
          ? readings.reduce((sum, metric) => sum + metric.cpuSeconds, 0) / seconds * 100 : null;
        return [variant, percent];
      }));
      const ratio = averages.before > 0 && averages.after !== null ? averages.after / averages.before : null;
      return [type, { coreEquivalentPercent: averages, ratio, atMostTenPercent: ratio === null ? null : ratio <= 0.1 }];
    }));
    for (const variant of ["before", "after"]) if (artifact(renderers[variant]).treeHash !== rendererArtifacts[variant].treeHash) throw new Error("采样期间renderer构建产物发生变化");
    writeFileSync(process.env.THINKLY_DIAG_REPORT, JSON.stringify({
      diagnostic: schedulerProbe ? "hidden-renderer-injected-scheduler" : baselineRenderer ? "hidden-renderer-bundle-crossover" : promote ? "hidden-renderer-layer-promotion" : causes ? "hidden-renderer-pause-causes" : "hidden-renderer-css-crossover", electron: process.versions.electron,
      runId: process.env.THINKLY_DIAG_ID, finishedAt: new Date().toISOString(),
      rendererHash: createHash("sha256").update(html).digest("hex"), renderer,
      cssPath, cssHashes, rendererArtifacts, comparison,
      fixtureRandom: { algorithm: "LCG32", seed: "0x54686e6b", reset: "each isolated renderer document before application scripts" },
      diagnosticCSSPriority: "unmodified source CSS appended as the last document.head style",
      constraints: ["show:false throughout", "no application main/preload", "fresh temporary profile", "external network blocked"],
      phases, errors,
    }, null, 2));
    win.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    if (win && !win.isDestroyed()) win.destroy();
    app.exit(1);
  }
}
