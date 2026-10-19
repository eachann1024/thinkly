import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { createChecker } from "../lib/check";

export default function run() {
  const checker = createChecker();
  const root = process.cwd();
  const filename = process.env.THINKLY_DOT_BEHAVIOR_REPORT || path.join(tmpdir(), "thinkly-dot-behavior.json");
  let report: any;
  try { report = JSON.parse(readFileSync(filename, "utf8")); } catch { checker.check("存在有效 Electron 行为验收报告", false); return checker.failed; }
  const age = Date.now() - Date.parse(report.finishedAt);
  const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
  const source = readFileSync(path.join(root, "scripts/perf/dot-motion-electron.mjs"), "utf8")
    + readFileSync(path.join(root, "scripts/perf/dot-motion-behavior.mjs"), "utf8");
  const directory = path.join(root, "dist-electron/renderer"), digest = createHash("sha256");
  const visit = (folder: string) => {
    for (const item of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) digest.update(path.relative(directory, file)).update("\0").update(readFileSync(file));
    }
  }; visit(directory);
  checker.check("报告绑定当前验收代码与完整构建产物，十分钟内完成", age >= 0 && age < 600_000
    && report.sourceHash === hash(source) && report.rendererHash === digest.digest("hex") && report.stableArtifact === true
    && report.cssHash === hash(readFileSync(path.join(root, "src/components/ui/dot-matrix/dot-matrix.css"))));
  checker.check("使用隔离真实 Electron，未显示桌面窗口或读取用户数据", Boolean(report.electron) && report.nativeVisible === false
    && ["fresh temporary profile", "no application main/preload", "external network blocked"].every((item) => report.constraints?.includes(item)));
  checker.check("行为验收无渲染错误且完整执行", Array.isArray(report.errors) && report.errors.length === 0
    && Array.isArray(report.checks) && report.checks.length >= 13);
  for (const item of report.checks ?? []) checker.check(item.label, item.ok === true, item.detail);
  return checker.failed;
}
