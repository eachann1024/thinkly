import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createChecker } from "./lib/check";

type EffectSlot = { deps: unknown[]; cleanup?: () => void; effect: () => void | (() => void); committedDeps?: unknown[]; needsRun?: boolean };

export default async function run(): Promise<number> {
  const checker = createChecker();
  const check = checker.check;
  const { build } = createRequire(resolve(process.cwd(), "package.json"))("esbuild") as typeof import("esbuild");
  const calls: Array<{ pageId: string; content: unknown }> = [];
  let refs: Array<{ current: any }> = [];
  let refCursor = 0;
  let effectSlots: Array<EffectSlot | undefined> = [];
  let effectCursor = 0;
  const timers = new Map<number, { fn: () => void; interval?: number }>();
  let nextTimer = 1;
  let aiPhase = "idle";
  const view = { active: "page-a", bumpRefresh() {} };
  const harness = {
    useRef<T>(initial: T) {
      const index = refCursor++;
      return (refs[index] ??= { current: initial });
    },
    useEffect(effect: EffectSlot["effect"], deps: unknown[]) {
      const index = effectCursor++;
      const slot = effectSlots[index] ?? (effectSlots[index] = { deps, effect });
      slot.needsRun = !slot.committedDeps || deps.some((value, i) => !Object.is(value, slot.committedDeps![i])) || deps.length !== slot.committedDeps.length;
      slot.deps = deps;
      slot.effect = effect;
    },
  };
  (globalThis as any).__historyHarness = harness;
  const originalTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  (globalThis as any).setTimeout = (fn: () => void) => { const id = nextTimer++; timers.set(id, { fn }); return id; };
  (globalThis as any).clearTimeout = (id: number) => { timers.delete(id); };
  (globalThis as any).setInterval = (fn: () => void, interval: number) => { const id = nextTimer++; timers.set(id, { fn, interval }); return id; };
  (globalThis as any).clearInterval = (id: number) => { timers.delete(id); };

  try {
    const result = await build({
      stdin: { contents: 'export { useHistoryRecorder } from "./src/hooks/useHistoryRecorder";', resolveDir: process.cwd(), sourcefile: "history-recorder-entry.ts" },
      bundle: true, write: false, platform: "node", format: "esm", packages: "bundle", logLevel: "silent",
      banner: { js: "const __filename='history-recorder.js'; const __dirname='.';" },
      define: { __filename: "'history-recorder.js'", __dirname: "'.'" },
      alias: { "@": `${process.cwd()}/src` },
      plugins: [{
        name: "history-recorder-shims",
        setup(buildApi) {
          buildApi.onResolve({ filter: /^react$/ }, () => ({ path: "react-shim", namespace: "history-shim" }));
          buildApi.onLoad({ filter: /^react-shim$/, namespace: "history-shim" }, () => ({ contents: `export const useRef=(v)=>globalThis.__historyHarness.useRef(v); export const useEffect=(f,d)=>globalThis.__historyHarness.useEffect(f,d);`, loader: "js" }));
          buildApi.onResolve({ filter: /content-derivations-cache/ }, () => ({ path: "derivations-shim", namespace: "history-shim" }));
          buildApi.onResolve({ filter: /snapshot$/ }, () => ({ path: "snapshot-shim", namespace: "history-shim" }));
          buildApi.onResolve({ filter: /contentSignature$/ }, () => ({ path: "signature-shim", namespace: "history-shim" }));
          buildApi.onResolve({ filter: /useAiStatus$/ }, () => ({ path: "ai-shim", namespace: "history-shim" }));
          buildApi.onResolve({ filter: /useHistoryView$/ }, () => ({ path: "view-shim", namespace: "history-shim" }));
          buildApi.onLoad({ filter: /.*/, namespace: "history-shim" }, (args) => {
            if (args.path === "derivations-shim") return { contents: `export const getContentDerivations=(_content, signature)=>({wordCount: String(signature).length});`, loader: "js" };
            if (args.path === "snapshot-shim") return { contents: `export const recordHistorySnapshotDetailed=(p)=>{ globalThis.__historyCalls.push(p); return Promise.resolve({status:"created"}); };`, loader: "js" };
            if (args.path === "signature-shim") return { contents: `export const getHistoryContentSignature=(content)=>JSON.stringify(content);`, loader: "js" };
            if (args.path === "ai-shim") return { contents: `export const useAiStatus={getState:()=>({phase:globalThis.__historyAiPhase})};`, loader: "js" };
            if (args.path === "view-shim") return { contents: `export const useHistoryView={getState:()=>globalThis.__historyView};`, loader: "js" };
            return { contents: "", loader: "js" };
          });
        },
      }],
    });
    (globalThis as any).__historyCalls = calls;
    (globalThis as any).__historyView = view;
    (globalThis as any).__historyAiPhase = aiPhase;
    const built = result.outputFiles[0].text;
    const mod = await import(`data:text/javascript;base64,${Buffer.from(built).toString("base64")}`);
    const render = (pageId: string, text: string | undefined, updatedAt: number) => {
      refCursor = 0;
      effectCursor = 0;
      const content = text === undefined ? undefined : [{ type: "paragraph", content: text }];
      mod.useHistoryRecorder({ pageId, workspaceId: "workspace", content, signature: text ?? "", updatedAt });
      for (const slot of effectSlots) {
        if (!slot) continue;
        const prior = (slot as any).committedDeps as unknown[] | undefined;
        if (slot.needsRun) {
          slot.cleanup?.();
          const cleanup = slot.effect();
          slot.cleanup = typeof cleanup === "function" ? cleanup : undefined;
          (slot as any).committedDeps = [...slot.deps];
          slot.needsRun = false;
        }
      }
    };
    const fireIntervals = () => { for (const timer of [...timers.values()]) if (timer.interval) timer.fn(); };
    const fireTimeouts = () => { const pending = [...timers.entries()].filter(([, timer]) => !timer.interval); for (const [id, timer] of pending) { timers.delete(id); timer.fn(); } };
    const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

    render("page-a", undefined, 1);
    render("page-a", "opening body", 1);
    render("page-a", "opening body normalized", 1);
    fireIntervals();
    await settle();
    check("content 延迟到达和同 updatedAt 的静默规范化只建立基线", calls.length === 0);

    render("page-b", undefined, 10);
    render("page-b", "page b baseline", 10);
    fireIntervals();
    await settle();
    check("切页后新页面只建立基线", calls.length === 0);

    render("page-b", "page b baseline + edit", 11);
    render("page-b", "page b baseline", 12);
    fireTimeouts();
    fireIntervals();
    await settle();
    check("首次编辑后撤回到基线会撤销 pending", calls.length === 0);

    render("page-b", "page b baseline + retained edit", 13);
    fireTimeouts();
    await settle();
    check("基线后的真实编辑在停笔后记录一次", calls.length === 1 && calls[0]?.pageId === "page-b" && calls[0]?.content?.[0]?.content === "page b baseline + retained edit", calls);
  } catch (error) {
    check("真实 hook 动态验收可运行", false, error instanceof Error ? error.stack : String(error));
  } finally {
    globalThis.setTimeout = originalTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalInterval;
    globalThis.clearInterval = originalClearInterval;
    delete (globalThis as any).__historyHarness;
    delete (globalThis as any).__historyCalls;
    delete (globalThis as any).__historyView;
    delete (globalThis as any).__historyAiPhase;
  }

  const reader = await readFile("src/pages/workspace/components/history/history-view/HistoryReader.tsx", "utf8");
  const body = await readFile("src/pages/workspace/layout/surfaces/NotebookAiWorkspaceBody.tsx", "utf8");
  const readerState = reader.slice(reader.indexOf("export function HistoryReaderState"), reader.indexOf("export\n\nfunction HistoryReader"));
  const historyBranch = body.slice(body.indexOf("inHistoryMode ?"), body.indexOf(": activePageId && page && !hideFolderHome"));
  check("空历史状态水平与垂直居中并占据剩余高度", /min-h-0/.test(readerState) && /flex-1/.test(readerState) && /items-center/.test(readerState) && /justify-center/.test(readerState));
  check("历史区祖先提供可计算高度到阅读器", /workspace-editor-surface[\s\S]*?flex-1[\s\S]*?min-h-0[\s\S]*?overflow-hidden/.test(historyBranch) && /h-full overflow-y-auto/.test(historyBranch) && /flex h-full min-h-full flex-col/.test(historyBranch));
  return checker.failed;
}
