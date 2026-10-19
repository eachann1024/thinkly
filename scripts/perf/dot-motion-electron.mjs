#!/usr/bin/env node
/** 无可见窗口的真实 Electron 行为验收；不载入业务 main/preload 或用户数据。 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDotMotion } from "./dot-motion-behavior.mjs";

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), "../..");
const reportFile = process.env.THINKLY_DOT_BEHAVIOR_REPORT || path.join(tmpdir(), "thinkly-dot-behavior.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (text) => createHash("sha256").update(text).digest("hex");
const sourceHash = () => hash(readFileSync(self) + readFileSync(path.join(path.dirname(self), "dot-motion-behavior.mjs")));
function artifact() {
  const directory = path.join(root, "dist-electron/renderer");
  const digest = createHash("sha256");
  const visit = (folder) => {
    for (const item of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) digest.update(path.relative(directory, file)).update("\0").update(readFileSync(file));
    }
  };
  visit(directory);
  return digest.digest("hex");
}
if (!process.versions.electron) {
  const profile = mkdtempSync(path.join(tmpdir(), "thinkly-dot-behavior-"));
  const env = { ...process.env, THINKLY_DOT_BEHAVIOR_PROFILE: profile, THINKLY_DOT_BEHAVIOR_REPORT: reportFile };
  delete env.ELECTRON_RUN_AS_NODE;
  let child;
  try {
    child = spawn(createRequire(import.meta.url)("electron"), [self], { env, stdio: "inherit" });
    const watchdog = setTimeout(() => child.kill("SIGKILL"), 60_000);
    const code = await new Promise((resolve, reject) => { child.on("exit", resolve); child.on("error", reject); })
      .finally(() => clearTimeout(watchdog));
    if (code !== 0) throw new Error(`Electron 行为验收退出：${code}`);
    const report = JSON.parse(readFileSync(reportFile, "utf8"));
    if (report.runId !== path.basename(profile)) throw new Error("拒绝陈旧行为报告");
    console.log(JSON.stringify({ report: reportFile, checks: report.checks, errors: report.errors }));
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  }
} else {
  void runElectronBehavior();
}

async function runElectronBehavior() {
  const { app, BrowserWindow, session } = await import("electron");
  const profile = process.env.THINKLY_DOT_BEHAVIOR_PROFILE;
  if (!profile?.startsWith(path.join(tmpdir(), "thinkly-dot-behavior-"))) throw new Error("拒绝非临时profile");
  let win;
  const errors = [];
  try {
    mkdirSync(path.join(profile, "session"), { recursive: true });
    app.setPath("userData", profile);
    app.setPath("sessionData", path.join(profile, "session"));
    const startedArtifact = artifact();
    await app.whenReady(); app.dock?.hide();
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !/^(file|data|blob):/.test(details.url) }));
    win = new BrowserWindow({ show: false, width: 1280, height: 900, paintWhenInitiallyHidden: true,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
    win.webContents.on("console-message", (event) => { if (event.level === "error") errors.push(event.message); });
    win.webContents.on("render-process-gone", (_event, details) => errors.push(details.reason));
    await win.loadFile(path.join(root, "dist-electron/renderer/index.html"));
    win.webContents.debugger.attach("1.3");
    await sleep(3000);
    const page = {
      evaluate(fn, input) { return win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(input) ?? "undefined"})`); },
      cdp(method, input) { return win.webContents.debugger.sendCommand(method, input); },
      async waitForFunction(fn, input, options) {
        const deadline = Date.now() + options.timeout;
        do { if (await this.evaluate(fn, input)) return; await sleep(25); } while (Date.now() < deadline);
        throw new Error("真实 renderer 状态等待超时");
      },
    };
    const after = readFileSync(path.join(root, "src/components/ui/dot-matrix/dot-matrix.css"), "utf8");
    const before = after.replace("--dm-loop-ease: steps(2, end)", "--dm-loop-ease: var(--dm-ease)");
    if (before === after || after.split("--dm-loop-ease: steps(2, end)").length !== 2) throw new Error("缺少唯一阶梯CSS标记");
    const checks = await verifyDotMotion(page, { before, after });
    const endedArtifact = artifact();
    const report = { runId: path.basename(profile), finishedAt: new Date().toISOString(), electron: process.versions.electron,
      cssHash: hash(after), sourceHash: sourceHash(), rendererHash: endedArtifact, stableArtifact: startedArtifact === endedArtifact,
      constraints: ["fresh temporary profile", "no application main/preload", "external network blocked"],
      nativeVisible: win.isVisible(), checks, errors };
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    if (errors.length || checks.some((item) => !item.ok)) process.exitCode = 1;
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { win?.destroy(); app.exit(process.exitCode || 0); }
}
