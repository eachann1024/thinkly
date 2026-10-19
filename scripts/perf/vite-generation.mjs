#!/usr/bin/env node
// Same-machine generator benchmark. Never starts Electron or touches the real source/profile.
// node scripts/perf/vite-generation.mjs --baseline-ref=<before-commit> --rounds=7 --burst=100
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir, cpus } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argument = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const rounds = Number(argument("rounds") ?? 7), burst = Number(argument("burst") ?? 100);
const only = argument("only");
if (!Number.isInteger(rounds) || rounds < 1 || !Number.isInteger(burst) || burst < 0) throw new Error("Invalid rounds/burst");
if (only && !["i18n", "auto-import"].includes(only)) throw new Error("Invalid --only");
const output = path.resolve(argument("output") ?? path.join(tmpdir(), `thinkly-vite-generation-${Date.now()}.json`));
const temporary = await mkdtemp(path.join(tmpdir(), "thinkly-vite-perf-"));
const require = createRequire(path.join(root, "package.json"));
const yaml = (text, key = "hello") => `zh-Hans:\n  ${key}: "${text}"\nen:\n  ${key}: "${text}"\nja:\n  ${key}: "${text}"\n`;
const messages = (text) => `import { i18nYaml } from "@/i18n";\nexport const perfMessages = i18nYaml\`\n${yaml(text)}\`;\n`;
const sourceFiles = new Map();
const baselineFiles = ["scripts/i18n/catalog.mjs", "scripts/i18n/compiler.mjs", "scripts/i18n/validate.mjs",
  "config/vite/autoImportDeclarations.ts", "config/vite/autoImportScanner.ts", "config/vite/autoImportEntries.ts",
  "config/vite/autoImportPackages.ts", "config/vite/i18nPlugin.ts", "config/vite/autoImportPlugin.ts"];
const generatorFiles = [...baselineFiles, "scripts/i18n/catalogFile.mjs", "scripts/i18n/catalogQueue.mjs",
  "scripts/i18n/catalogSession.mjs", "scripts/i18n/catalogQueue.d.mts", "scripts/i18n/catalogSession.d.mts"];
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const manifest = (files) => [...files].map(([name, content]) => ({ path: name, sha256: sha256(content) }));
function gitShow(ref, file) {
  const shown = spawnSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (shown.status !== 0) throw new Error(shown.stderr);
  return shown.stdout;
}
async function put(directory, name, content) {
  const filename = path.join(directory, name);
  await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, content);
}
async function sources(directory, relative = "") {
  const result = new Map();
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) for (const [key, value] of await sources(directory, name)) result.set(key, value);
    else if (/\.(?:[cm]?[jt]sx?|ya?ml)$/.test(name)) result.set(name.replaceAll("\\", "/"), await readFile(path.join(directory, name), "utf8"));
  }
  return result;
}
function digest(files) {
  const hash = createHash("sha256");
  for (const [name, text] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) hash.update(name).update("\0").update(text).update("\0");
  return hash.digest("hex");
}
async function measured(run) {
  const cpu = process.cpuUsage(), start = performance.now();
  await run();
  const elapsed = process.cpuUsage(cpu);
  return { wallMs: performance.now() - start, cpuMs: (elapsed.user + elapsed.system) / 1000 };
}
function statistics(samples) {
  const quantile = (key, q) => samples.map((sample) => sample[key]).sort((a, b) => a - b)[Math.ceil(samples.length * q) - 1];
  return { p50WallMs: quantile("wallMs", 0.5), p95WallMs: quantile("wallMs", 0.95),
    p50CpuMs: quantile("cpuMs", 0.5), p95CpuMs: quantile("cpuMs", 0.95) };
}
const delta = (before, after) => Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - (before[key] ?? 0)]));
try {
  await symlink(path.join(root, "node_modules"), path.join(temporary, "node_modules"), "dir");
  let baseline = argument("baseline");
  const baselineRef = argument("baseline-ref") ?? "HEAD";
  const resolved = spawnSync("git", ["rev-parse", "--verify", `${baselineRef}^{commit}`], { cwd: root, encoding: "utf8" });
  if (resolved.status !== 0) throw new Error(resolved.stderr);
  const baselineCommit = resolved.stdout.trim();
  if (!baseline) {
    baseline = path.join(temporary, "baseline");
    for (const file of baselineFiles) await put(baseline, file, gitShow(baselineCommit, file));
  }
  baseline = path.resolve(baseline);
  const beforeCode = new Map(await Promise.all(baselineFiles.map(async (file) => [file, await readFile(path.join(baseline, file), "utf8")])));
  for (const [file, content] of beforeCode) if (content !== gitShow(baselineCommit, file)) throw new Error(`Baseline differs from ${baselineCommit}: ${file}`);
  const afterCode = new Map(await Promise.all(generatorFiles.map(async (file) => [file, await readFile(path.join(root, file), "utf8")])));
  const benchmarkCodeHash = sha256(await readFile(fileURLToPath(import.meta.url)));
  const oldCatalog = await import(pathToFileURL(path.join(baseline, "scripts/i18n/catalog.mjs")).href);
  const { createCatalogSession } = await import(pathToFileURL(path.join(root, "scripts/i18n/catalogSession.mjs")).href);
  const modules = [];
  for (const [name, location] of [["old", baseline], ["new", root]]) {
    const filename = path.join(temporary, `${name}-auto-import.mjs`);
    await require("esbuild").build({ entryPoints: [path.join(location, "config/vite/autoImportDeclarations.ts")], outfile: filename,
      bundle: true, packages: "external", platform: "node", format: "esm", logLevel: "silent" });
    modules.push(await import(pathToFileURL(filename).href));
  }
  for (const directory of ["src", "electron"]) for (const [name, text] of await sources(root, directory)) sourceFiles.set(name, text);
  sourceFiles.set("src/__vite_perf_plain.ts", "export const perfPlain = 0;\n");
  sourceFiles.set("src/__vite_perf_messages.ts", messages("Initial"));
  const oldRoot = path.join(temporary, "old"), newRoot = path.join(temporary, "new");
  for (const [name, text] of sourceFiles) { await put(oldRoot, name, text); await put(newRoot, name, text); }
  const session = createCatalogSession(newRoot), generator = modules[1].createAutoImportDeclarationGenerator(newRoot);
  let oldCatalogRuns = 0, oldDeclarationRuns = 0;
  const collectOld = async () => { oldCatalogRuns++; await oldCatalog.collectCatalog(oldRoot, true); };
  const generateOld = async () => { oldDeclarationRuns++; await modules[0].generateAutoImportDeclarations(oldRoot); };
  const cold = { oldCatalog: await measured(collectOld), newCatalog: await measured(() => session.refresh()),
    oldDeclarations: await measured(generateOld), newDeclarations: await measured(() => generator.generate()) };
  const results = [];
  const edit = async (name, text) => { await put(oldRoot, name, text); await put(newRoot, name, text); };
  async function benchmark(name, change, oldRun, newRun, metrics) {
    if (only && !name.includes(only)) return;
    console.log(`Measuring ${name} (${rounds} alternating rounds)`);
    const old = [], current = [], before = { ...metrics() };
    const oldBefore = { oldCatalogRuns, oldDeclarationRuns };
    for (let index = 0; index < rounds; index++) {
      await change(index);
      if (index % 2) { current.push(await measured(newRun)); old.push(await measured(oldRun)); }
      else { old.push(await measured(oldRun)); current.push(await measured(newRun)); }
    }
    const oldStats = statistics(old), newStats = statistics(current);
    const wallRatio = newStats.p50WallMs / oldStats.p50WallMs, cpuRatio = newStats.p50CpuMs / oldStats.p50CpuMs;
    const tenPercent = wallRatio <= 0.1 && cpuRatio <= 0.1, within50ms = newStats.p95WallMs <= 50;
    results.push({ name, old: oldStats, current: newStats, wallRatio, cpuRatio, tenPercent, within50ms,
      work: { oldCatalogRuns: oldCatalogRuns - oldBefore.oldCatalogRuns, oldDeclarationRuns: oldDeclarationRuns - oldBefore.oldDeclarationRuns,
        ...delta(before, metrics()) }, samples: { old, current } });
  }
  const plain = "src/__vite_perf_plain.ts", translation = "src/__vite_perf_messages.ts";
  await benchmark("i18n/ordinary-edit", (n) => edit(plain, `export const perfPlain = ${n};\n`), collectOld,
    () => session.refresh([path.join(newRoot, plain)]), () => session.metrics);
  await benchmark("i18n/translation-text", (n) => edit(translation, messages(`Text ${n}`)), collectOld,
    () => session.refresh([path.join(newRoot, translation)]), () => session.metrics);
  await benchmark("i18n/schema-change", (n) => edit(translation, messages(`Hello {{name${n}}}`)), collectOld,
    () => session.refresh([path.join(newRoot, translation)]), () => session.metrics);
  await benchmark("i18n/source-write-echo", async () => {}, collectOld,
    () => session.refresh([path.join(newRoot, translation)]), () => session.metrics);
  const { autoImportEntries } = await import(pathToFileURL(path.join(temporary, "new-auto-import.mjs")).href);
  // The public entries are intentionally not re-exported by the generator; read the existing TS data via esbuild.
  let publicEntry = autoImportEntries?.[0];
  if (!publicEntry) {
    const entriesCode = await require("esbuild").transform(await readFile(path.join(root, "config/vite/autoImportEntries.ts"), "utf8"), { loader: "ts", format: "cjs" });
    const data = { exports: {} }; new Function("module", "exports", entriesCode.code)(data, data.exports);
    publicEntry = data.exports.autoImportEntries[0];
  }
  const publicCode = await readFile(path.join(oldRoot, publicEntry), "utf8");
  await benchmark("auto-import/private-edit", (n) => edit(plain, `export const perfPlain = ${n + 20};\n`), generateOld,
    () => generator.generate([path.join(newRoot, plain)]), () => generator.metrics);
  await benchmark("auto-import/public-body", (n) => edit(publicEntry, `${publicCode}\n// perf body ${n}\n`), generateOld,
    () => generator.generate([path.join(newRoot, publicEntry)]), () => generator.metrics);
  await benchmark("auto-import/export-change", (n) => edit(publicEntry, `${publicCode}\nexport const __thinklyPerfExport${n} = ${n};\n`), generateOld,
    () => generator.generate([path.join(newRoot, publicEntry)]), () => generator.metrics);
  let burstResult;
  if (burst && (!only || "i18n".includes(only))) {
    console.log(`Measuring i18n queue burst (${burst} requests)`);
    await edit(plain, "export const perfPlain = 999;\n");
    const before = { ...session.queueMetrics };
    const old = await measured(async () => {
      let queued = Promise.resolve();
      const requests = Array.from({ length: burst }, () => {
        queued = queued.catch(() => undefined).then(collectOld); return queued;
      });
      await Promise.all(requests);
    });
    const current = await measured(() => Promise.all(Array.from({ length: burst }, () => session.refresh([path.join(newRoot, plain)]))));
    burstResult = { requests: burst, old, current, wallRatio: current.wallMs / old.wallMs, cpuRatio: current.cpuMs / old.cpuMs,
      queue: { ...delta(before, session.queueMetrics), maxActive: session.queueMetrics.maxActive, maxQueuedBatches: session.queueMetrics.maxQueuedBatches } };
  }
  const oldSnapshot = new Map(), newSnapshot = new Map();
  for (const directory of ["src", "electron"]) {
    for (const [name, text] of await sources(oldRoot, directory)) oldSnapshot.set(name, text);
    for (const [name, text] of await sources(newRoot, directory)) newSnapshot.set(name, text);
  }
  const outputHashes = { old: digest(oldSnapshot), current: digest(newSnapshot) };
  const equivalent = outputHashes.old === outputHashes.current;
  const afterMeasurement = new Map(await Promise.all(generatorFiles.map(async (file) => [file, await readFile(path.join(root, file), "utf8")])));
  const codeStable = digest(afterCode) === digest(afterMeasurement);
  const accepted = equivalent && codeStable && results.length > 0 && results.every((result) => result.tenPercent && result.within50ms);
  const report = { schemaVersion: 2, timestamp: new Date().toISOString(), scope: "Generator calls only; excludes Vite transforms, HMR paint and Electron runtime",
    runtime: process.version, platform: `${process.platform}/${process.arch}`, cpu: cpus()[0]?.model,
    baseline: argument("baseline") ? baseline : baselineRef, baselineCommit, baselineCodeHash: digest(beforeCode), baselineSourceFiles: manifest(beforeCode),
    generatorCodeHash: digest(afterCode), generatorSourceFiles: manifest(afterCode), benchmarkCodeHash, codeStable,
    rounds, only, inputFiles: sourceFiles.size, inputHash: digest(sourceFiles), sampleOrder: "old/new on even rounds; new/old on odd rounds",
    sourceFilesPerOldFullRun: [...sourceFiles].filter(([name]) => /\.(?:[jt]sx?|ya?ml)$/.test(name) && !name.endsWith(".d.ts")).length,
    typeProgramsPerOldFullRun: [...sourceFiles].filter(([name, text]) => /\.[jt]sx?$/.test(name) && !name.endsWith(".d.ts") && text.includes("i18n")).length,
    cold, results, burst: burstResult, outputHashes, outputsByteEquivalent: equivalent, accepted,
    limitation: "Schema/ID changes still rebuild sorted catalog chunks. Auto-import change uses dirty paths; startup/add/unlink use full scans. Export changes still publish the global declarations. No million-record or whole-app latency claim." };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ output, accepted, outputsByteEquivalent: equivalent, results: results.map(({ name, old, current, wallRatio, cpuRatio, tenPercent, within50ms }) =>
    ({ name, old, current, wallRatio, cpuRatio, tenPercent, within50ms })), burst: burstResult, cold }, null, 2));
  await session.close();
  if (!accepted) process.exitCode = 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
