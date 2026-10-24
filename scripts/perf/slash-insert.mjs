#!/usr/bin/env node
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getHeapStatistics } from "node:v8";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const outDir = "/tmp/thinkly-slash-insert-bench";
const sourcePath = path.join(root, "src/components/editor/core/blocknoteSlashActions.ts");
const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const sizes = (value("sizes", "1000,10000")).split(",").map(Number);
const samples = Number(value("samples", "10"));
const enforceGate = args.includes("--gate");
if (sizes.some((n) => !Number.isSafeInteger(n) || n < 1) || !Number.isInteger(samples) || samples < 1) {
  throw new Error("Use positive integer --sizes and --samples values");
}

await mkdir(outDir, { recursive: true });
try { await symlink(path.join(root, "node_modules"), path.join(outDir, "node_modules"), "dir"); } catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const currentSource = await readFile(sourcePath, "utf8");
const currentSourceHash = createHash("sha256").update(currentSource).digest("hex");
const baselineSourcePath = path.join(root, "scripts/perf/slash-insert-baseline.ts");
const baselineBundlePath = path.join(outDir, "slash-actions-baseline.mjs");
const currentBundlePath = path.join(outDir, "slash-actions-current.mjs");
const baselineSource = await readFile(baselineSourcePath);
const baselineSourceHash = createHash("sha256").update(baselineSource).digest("hex");
const bundle = async (entry, outfile) => build({
  entryPoints: [entry], outfile, bundle: true, platform: "node", format: "esm", logLevel: "silent",
  external: ["@blocknote/core"],
});
await bundle(baselineSourcePath, baselineBundlePath);
await bundle(sourcePath, currentBundlePath);

const [{ BlockNoteEditor, getBlockInfoFromTransaction }, { TextSelection }, { createSlashBlockInsertion: currentInsertion }, { createSlashBlockInsertion: baselineInsertion }] = await Promise.all([
  import("@blocknote/core"), import("prosemirror-state"), import(pathToFileURL(currentBundlePath)), import(pathToFileURL(baselineBundlePath)),
]);
globalThis.window = { setTimeout: () => 0 };
globalThis.requestAnimationFrame = () => 0;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const summary = (values) => ({ p50Ms: +percentile(values, 0.5).toFixed(3), p95Ms: +percentile(values, 0.95).toFixed(3) });
const results = [];
const jsonPath = value("json", path.join(outDir, "results.json"));

async function benchScale(count) {
  global.gc?.();
  const blocks = Array.from({ length: count }, (_, index) => ({
    type: "paragraph", content: index === count - 1 ? "/cod" : "x",
  }));
  const initStart = performance.now();
  const editor = BlockNoteEditor.create({ initialContent: blocks });
  const initMs = performance.now() - initStart;
  const initialDoc = editor.prosemirrorState.doc;
  const selectSlashAtEnd = () => editor.transact((tr) => tr.setSelection(TextSelection.atEnd(tr.doc)));
  const resetEditor = () => {
    const start = performance.now();
    editor.transact((tr) => {
      tr.replaceWith(0, tr.doc.content.size, initialDoc.content);
      tr.setSelection(TextSelection.atEnd(tr.doc));
    });
    return performance.now() - start;
  };
  selectSlashAtEnd();
  const lastBlockId = getBlockInfoFromTransaction(editor.prosemirrorState.tr).bnBlock.node.attrs.id;
  const runAction = (variant) => {
    let transactionCount = 0;
    const onTransaction = () => { transactionCount += 1; };
    editor._tiptapEditor.on("transaction", onTransaction);
    const start = performance.now();
    let error = null;
    try {
      (variant === "current" ? currentInsertion : baselineInsertion)(editor)({ type: "heading", props: { level: 1 } });
    } catch (caught) {
      error = String(caught);
    }
    const actionMs = performance.now() - start;
    editor._tiptapEditor.off("transaction", onTransaction);
    const state = editor.prosemirrorState;
    const selectedBlock = getBlockInfoFromTransaction(state.tr).bnBlock.node;
    const resultOk = state.doc.firstChild?.childCount === count
      && selectedBlock.attrs.id === lastBlockId
      && state.selection.$from.parent.type.name === "heading"
      && state.selection.$from.parent.textContent === "";
    return { actionMs: +actionMs.toFixed(3), transactionCount, resultOk, error };
  };
  // Warm both variants against the real editor, restoring its real PM document between calls.
  resetEditor(); runAction("baseline"); resetEditor(); runAction("current"); resetEditor();
  const perVariant = { baseline: [], current: [] };
  const transactions = { baseline: [], current: [] };
  const resets = [];
  let failures = 0;
  const failureDetails = [];
  for (let index = 0; index < samples; index += 1) {
    const order = index % 2 === 0 ? ["baseline", "current"] : ["current", "baseline"];
    for (const variant of order) {
      resets.push(resetEditor());
      const run = runAction(variant);
      if (run.error || !run.resultOk) {
        failures += 1;
        failureDetails.push({ variant, error: run.error, resultOk: run.resultOk });
      }
      if (!run.error && run.resultOk) {
        perVariant[variant].push(run.actionMs);
        transactions[variant].push(run.transactionCount);
      }
    }
  }
  const restoreSummary = summary(resets);
  editor._tiptapEditor.destroy();
  global.gc?.();
  return {
    blocks: count, requestedSamplesPerVariant: samples, failures, failureDetails,
    initializationMs: +initMs.toFixed(3), documentRestore: restoreSummary,
    baseline: { validSamples: perVariant.baseline.length, action: summary(perVariant.baseline), transactionCounts: transactions.baseline },
    current: { validSamples: perVariant.current.length, action: summary(perVariant.current), transactionCounts: transactions.current },
    ratioCurrentOverBaselineP50: perVariant.baseline.length && perVariant.current.length
      ? +(summary(perVariant.current).p50Ms / summary(perVariant.baseline).p50Ms).toFixed(3) : null,
    ratioCurrentOverBaselineP95: perVariant.baseline.length && perVariant.current.length
      ? +(summary(perVariant.current).p95Ms / summary(perVariant.baseline).p95Ms).toFixed(3) : null,
    meetsOneTenthLatencyP50Gate: Boolean(perVariant.baseline.length && perVariant.current.length)
      && summary(perVariant.current).p50Ms <= summary(perVariant.baseline).p50Ms * 0.1,
    meetsOneTenthLatencyP95Gate: Boolean(perVariant.baseline.length && perVariant.current.length)
      && summary(perVariant.current).p95Ms <= summary(perVariant.baseline).p95Ms * 0.1,
    meets50msActionTarget: Boolean(perVariant.current.length) && summary(perVariant.current).p95Ms <= 50,
  };
}

for (const count of sizes) {
  const item = await benchScale(count);
  results.push(item);
  await writeFile(jsonPath, `${JSON.stringify({
    label: "previous workspace snapshot vs current; headless BlockNote action microbenchmark, not React/Electron end-to-end",
    baselineSource: baselineSourcePath, baselineSourceSha256: baselineSourceHash,
    baselineSnapshot: "previous workspace implementation; not git HEAD", baselineBundle: baselineBundlePath,
    currentSource: sourcePath, currentSourceSha256: currentSourceHash,
    node: process.version, platform: `${process.platform}/${process.arch}`,
    v8HeapLimitMB: +(getHeapStatistics().heap_size_limit / 1048576).toFixed(1), samples, results, gateEnforced: enforceGate,
    excluded: ["React hook/SuggestionMenu.clearQuery", "timer callback", "requestAnimationFrame scroll/DOM", "Electron renderer paint"],
  }, null, 2)}\n`);
}
const report = {
  label: "previous workspace snapshot vs current; headless BlockNote action microbenchmark, not React/Electron end-to-end",
  baselineSource: baselineSourcePath, baselineSourceSha256: baselineSourceHash,
  baselineSnapshot: "previous workspace implementation; not git HEAD", baselineBundle: baselineBundlePath,
  currentSource: sourcePath, currentSourceSha256: currentSourceHash,
  node: process.version, platform: `${process.platform}/${process.arch}`,
  v8HeapLimitMB: +(getHeapStatistics().heap_size_limit / 1048576).toFixed(1), samples, results, gateEnforced: enforceGate,
  excluded: ["React hook/SuggestionMenu.clearQuery", "timer callback", "requestAnimationFrame scroll/DOM", "Electron renderer paint"],
};
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (enforceGate && results.some((item) => item.failures > 0
  || item.baseline.validSamples < samples || item.current.validSamples < samples
  || !item.meetsOneTenthLatencyP50Gate || !item.meetsOneTenthLatencyP95Gate
  || !item.meets50msActionTarget)) {
  process.exitCode = 1;
}
