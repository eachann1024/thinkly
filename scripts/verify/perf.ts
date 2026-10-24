import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";

const EAGER_BUDGET_KB = 5600;
const PRELOAD_LINK_BUDGET = 62;
const LARGEST_EAGER_CHUNK_BUDGET_KB = 830;
const RENDERER_BUDGET_KB = 26 * 1024;
const FORBIDDEN_KB = 24;
const FORBIDDEN_IN_EAGER = [
  { name: "react-pdf", marker: "react-pdf" },
  { name: "echarts", marker: "vendor-echarts" },
  { name: "mermaid", marker: "vendor-mermaid" },
  { name: "prettier", marker: "vendor-prettier" },
];

const root = process.cwd();
const rendererDir = path.join(root, "dist-electron/renderer");

function fileKB(file: string): number {
  return Math.round(statSync(file).size / 1024);
}

function dirKB(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? dirKB(full) : fileKB(full));
  }, 0);
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const htmlPath = path.join(rendererDir, "index.html");

  if (!existsSync(htmlPath)) {
    console.log("  · 未找到 dist-electron/renderer/index.html，跳过（先运行 node scripts/run-task.mjs build）");
    return checker.failed;
  }

  const html = readFileSync(htmlPath, "utf8");
  const eager = [...html.matchAll(/(?:href|src)="\.\/((?:assets|chunks)\/[^"]+\.js)"/g)]
    .map((match) => match[1])
    .filter((value, index, list) => list.indexOf(value) === index);
  const eagerKB = eager.reduce((sum, rel) => {
    const full = path.join(rendererDir, rel);
    return sum + (existsSync(full) ? fileKB(full) : 0);
  }, 0);
  const preloadLinks = (html.match(/rel="modulepreload"/g) ?? []).length;

  const biggest = eager
    .map((rel) => ({ rel: path.basename(rel), kb: fileKB(path.join(rendererDir, rel)) }))
    .sort((a, b) => b.kb - a.kb)[0];

  console.log(`  · 首屏 JS ${eagerKB}KB / ${eager.length} 个文件，modulepreload ${preloadLinks} 条，最大块 ${biggest?.rel} ${biggest?.kb}KB`);
  check(`首屏 JS ≤ ${EAGER_BUDGET_KB}KB`, eagerKB <= EAGER_BUDGET_KB, `当前 ${eagerKB}KB`);
  check(`modulepreload 条数 ≤ ${PRELOAD_LINK_BUDGET}`, preloadLinks <= PRELOAD_LINK_BUDGET, `当前 ${preloadLinks}`);
  check(`最大首屏块 ≤ ${LARGEST_EAGER_CHUNK_BUDGET_KB}KB`, (biggest?.kb ?? 0) <= LARGEST_EAGER_CHUNK_BUDGET_KB, biggest);

  for (const rule of FORBIDDEN_IN_EAGER) {
    const hits = eager.filter((rel) => rel.includes(rule.marker));
    const kb = hits.reduce((sum, rel) => sum + fileKB(path.join(rendererDir, rel)), 0);
    check(`首屏不含 ${rule.name}（>${FORBIDDEN_KB}KB）`, kb <= FORBIDDEN_KB, `${kb}KB：${hits.map((rel) => path.basename(rel)).join(", ")}`);
  }

  const rendererKB = dirKB(rendererDir);
  console.log(`  · renderer 总体积 ${Math.round(rendererKB / 1024)}MB`);
  check(`renderer ≤ ${RENDERER_BUDGET_KB / 1024}MB`, rendererKB <= RENDERER_BUDGET_KB, `${Math.round(rendererKB / 1024)}MB`);

  const mainDir = path.join(root, "dist-electron/main");
  const maps = existsSync(mainDir) ? readdirSync(mainDir).filter((name) => name.endsWith(".map")) : [];
  check("主进程产物不含 sourcemap", maps.length === 0, maps.join(", "));

  const packRenderer = path.join(root, "dist-electron/app-pack/renderer");
  if (existsSync(packRenderer)) {
    const packMaps = (() => {
      const found: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".map")) found.push(path.relative(packRenderer, full));
        }
      };
      walk(packRenderer);
      return found;
    })();
    check("打包目录不含 sourcemap", packMaps.length === 0, packMaps.slice(0, 5).join(", "));
  }

  return checker.failed;
}
