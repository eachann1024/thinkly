import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createChecker } from "../lib/check";

const baselineFiles = ["scripts/i18n/catalog.mjs", "scripts/i18n/compiler.mjs", "scripts/i18n/validate.mjs",
  "config/vite/autoImportDeclarations.ts", "config/vite/autoImportScanner.ts", "config/vite/autoImportEntries.ts",
  "config/vite/autoImportPackages.ts", "config/vite/i18nPlugin.ts", "config/vite/autoImportPlugin.ts"];
const generatorFiles = [...baselineFiles, "scripts/i18n/catalogFile.mjs", "scripts/i18n/catalogQueue.mjs",
  "scripts/i18n/catalogSession.mjs", "scripts/i18n/catalogQueue.d.mts", "scripts/i18n/catalogSession.d.mts"];
type Sample = { wallMs: number; cpuMs: number };
type Stats = { p50WallMs: number; p95WallMs: number; p50CpuMs: number; p95CpuMs: number };
type Manifest = { path: string; sha256: string }[];
const hash = (content: string | Buffer) => createHash("sha256").update(content).digest("hex");
function digest(files: Map<string, string>) {
  const result = createHash("sha256");
  for (const [name, content] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) result.update(name).update("\0").update(content).update("\0");
  return result.digest("hex");
}
function git(args: string[]) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Git source unavailable");
  return result.stdout;
}
function statistics(samples: Sample[]): Stats {
  const q = (key: keyof Sample, fraction: number) => samples.map((sample) => sample[key]).sort((a, b) => a - b)[Math.ceil(samples.length * fraction) - 1];
  return { p50WallMs: q("wallMs", 0.5), p95WallMs: q("wallMs", 0.95), p50CpuMs: q("cpuMs", 0.5), p95CpuMs: q("cpuMs", 0.95) };
}
const same = (actual: number, expected: number) => Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10;
const validSamples = (samples: Sample[]) => Array.isArray(samples) && samples.length === 7
  && samples.every((sample) => Number.isFinite(sample.wallMs) && sample.wallMs > 0 && Number.isFinite(sample.cpuMs) && sample.cpuMs >= 0);
const matchesManifest = (manifest: Manifest, files: Map<string, string>) => Array.isArray(manifest) && manifest.length === files.size
  && new Set(manifest.map((file) => file.path)).size === files.size
  && manifest.every((file) => files.has(file.path) && hash(files.get(file.path)!) === file.sha256);

export default async function run() {
  const checker = createChecker(), { check } = checker;
  const locations = [["i18n", process.env.THINKLY_VITE_I18N_REPORT], ["auto-import", process.env.THINKLY_VITE_AUTOIMPORT_REPORT]] as const;
  check("性能验收显式提供 i18n 与 auto-import 两份报告", locations.every(([, filename]) => filename));
  if (locations.some(([, filename]) => !filename)) return checker.failed;
  let baselineCommit: string, before: Map<string, string>, current: Map<string, string>, benchmarkHash: string;
  try {
    baselineCommit = git(["rev-parse", "--verify", "02c55a06^{commit}"]).trim();
    before = new Map(baselineFiles.map((file) => [file, git(["show", `${baselineCommit}:${file}`])]));
    current = new Map(await Promise.all(generatorFiles.map(async (file) => [file, await readFile(path.join(process.cwd(), file), "utf8")] as const)));
    benchmarkHash = hash(await readFile(path.join(process.cwd(), "scripts/perf/vite-generation.mjs")));
    check("可读取当前生成器与任务开始时的真实基线源码", true);
  } catch { check("可读取当前生成器与任务开始时的真实基线源码", false); return checker.failed; }
  const reports: any[] = [];
  for (const [scope, filename] of locations) {
    let report: any;
    try { report = JSON.parse(await readFile(filename!, "utf8")); }
    catch { check(`${scope} 报告可读取`, false); continue; }
    reports.push(report);
    check(`${scope} 为七轮交错改前/改后实测`, report.schemaVersion === 2 && report.rounds === 7 && report.only === scope
      && report.sampleOrder === "old/new on even rounds; new/old on odd rounds" && Array.isArray(report.results));
    check(`${scope} 基线源码指纹绑定 02c55a06`, report.baselineCommit === baselineCommit
      && report.baselineCodeHash === digest(before) && matchesManifest(report.baselineSourceFiles, before));
    check(`${scope} 新版源码与基准脚本指纹匹配当前文件`, report.codeStable === true
      && report.generatorCodeHash === digest(current) && matchesManifest(report.generatorSourceFiles, current)
      && report.benchmarkCodeHash === benchmarkHash);
    check(`${scope} 相同输入与全部输出逐字节一致`, Number.isInteger(report.inputFiles) && report.inputFiles > 0
      && /^[a-f0-9]{64}$/.test(report.inputHash) && report.outputsByteEquivalent === true
      && /^[a-f0-9]{64}$/.test(report.outputHashes?.old) && report.outputHashes.old === report.outputHashes.current);
    const names = scope === "i18n" ? ["ordinary-edit", "translation-text", "schema-change", "source-write-echo"]
      : ["private-edit", "public-body", "export-change"];
    check(`${scope} 热路径样本齐全且无重复`, Array.isArray(report.results) && report.results.length === names.length
      && names.every((name) => report.results.filter((result: any) => result.name === `${scope}/${name}`).length === 1));
    for (const name of names) {
      const result = report.results?.find((item: any) => item.name === `${scope}/${name}`);
      const valid = result && validSamples(result.samples?.old) && validSamples(result.samples?.current);
      check(`${scope}/${name} 保留七组有效原始 wall/CPU 样本`, valid);
      if (!valid) continue;
      const old = statistics(result.samples.old), now = statistics(result.samples.current);
      const wallRatio = now.p50WallMs / old.p50WallMs, cpuRatio = now.p50CpuMs / old.p50CpuMs;
      check(`${scope}/${name} 汇总数值由原始样本重算一致`, Object.entries(old).every(([key, value]) => same(result.old?.[key], value))
        && Object.entries(now).every(([key, value]) => same(result.current?.[key], value))
        && same(result.wallRatio, wallRatio) && same(result.cpuRatio, cpuRatio));
      check(`${scope}/${name} wall 与 CPU 中位耗时均不超过改前 10%`, result.tenPercent === true
        && wallRatio <= 0.1 && cpuRatio <= 0.1 && Number.isFinite(cpuRatio));
      check(`${scope}/${name} 新版 wall p95 不超过 50 ms`, result.within50ms === true && now.p95WallMs <= 50);
    }
    check(`${scope} 基准程序返回达标状态`, report.accepted === true);
  }
  check("两份报告使用同一原始基线与同一新版源码", reports.length === 2
    && reports[0].baselineCodeHash === reports[1].baselineCodeHash
    && reports[0].generatorCodeHash === reports[1].generatorCodeHash
    && reports[0].benchmarkCodeHash === reports[1].benchmarkCodeHash);
  return checker.failed;
}
