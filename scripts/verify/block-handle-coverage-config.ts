import { readFileSync } from "node:fs";
import { blockHandleCoverageConfig, latestCoverageChecks } from "./lib/block-handle-coverage-config";
import { createChecker } from "./lib/check";

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const all = blockHandleCoverageConfig({});
  check("全量入口默认保留四类工具栏的八项时序检查", all.scope === "all" && all.sequenceCases.length === 4 && all.sequenceCases.every((item) => item.steady && item.cancel));
  const prior = ["image", "codeBlock", "file", "table"].flatMap((type) => [
    { name: `${type} 先把手后200ms工具栏且无提前显示`, passed: false },
    { name: `${type} 快速离开取消待出现的工具栏`, passed: type === "file" },
    { name: `${type} 显示单一类型图标和六点把手`, passed: true },
  ]);
  const retry = blockHandleCoverageConfig({ THINKLY_EGO_COVERAGE_SCOPE: "failed-sequence", THINKLY_EGO_TASK: "51" }, prior);
  check("失败时序入口仅重跑七项，不重复已通过的文件取消和其他界面项", retry.sequenceCases.reduce((count, item) => count + Number(item.steady) + Number(item.cancel), 0) === 7 &&
    retry.sequenceCases.find((item) => item.type === "file")?.cancel === false && retry.task === "51");
  check("时序重跑写独立证据文件，保留原全量结果", retry.proofPath !== all.proofPath && retry.scope === "failed-sequence");
  const latest = [
    { name: "image 先把手后200ms工具栏且无提前显示", passed: true },
    { name: "table 先把手后200ms工具栏且无提前显示", passed: false },
    { name: "table 快速离开取消待出现的工具栏", passed: true },
  ];
  const remaining = blockHandleCoverageConfig({ THINKLY_EGO_COVERAGE_SCOPE: "failed-sequence" }, latestCoverageChecks([
    { checks: latest, modifiedAt: 20 }, { checks: prior, modifiedAt: 10 },
  ]));
  check("再次重跑读取最新时序证据，仅保留表格稳态失败项", remaining.sequenceCases.length === 1 &&
    remaining.sequenceCases[0].type === "table" && remaining.sequenceCases[0].steady && !remaining.sequenceCases[0].cancel);
  const sequence = blockHandleCoverageConfig({ THINKLY_EGO_COVERAGE_SCOPE: "sequence" });
  check("独立时序入口不依赖上一份失败记录", sequence.sequenceCases.length === 4 && sequence.scope === "sequence");
  let rejected = false;
  try { blockHandleCoverageConfig({ THINKLY_EGO_COVERAGE_SCOPE: "failed-sequence" }); } catch { rejected = true; }
  check("缺少失败项时明确停止，避免空跑误报通过", rejected);
  const helpers = readFileSync("scripts/verify/browser/block-handles-coverage-helpers.mjs", "utf8");
  check("表格真实鼠标选点优先首个单元格中心，避开外层空白", helpers.includes("content.querySelector('td, th')") &&
    helpers.includes("rect.x + rect.width / 2, y: rect.y + rect.height / 2"));
  const main = readFileSync("scripts/verify/browser/block-handles-coverage.mjs", "utf8");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let syntax = true;
  try { new AsyncFunction("verificationConfig", helpers + "\n" + main); } catch { syntax = false; }
  check("EGO拼接脚本语法完整（只解析，不启动浏览器）", syntax);
  let dragSyntax = true;
  try { new AsyncFunction("verificationConfig", helpers + "\n" + readFileSync("scripts/verify/browser/block-drag-perf.mjs", "utf8")); } catch { dragSyntax = false; }
  check("持续原生拖动性能脚本拼接语法完整（不启动浏览器）", dragSyntax);
  check("DOM采样与rAF性能记录分离并明确未证明paint", helpers.includes("timer = setTimeout(sample, 16)") && helpers.includes("frame = requestAnimationFrame(sampleFrame)") && main.includes("paintVerified: false") && main.includes("DOM状态先把手后200ms"));
  check("快速离开使用真实CDP鼠标且验证可信事件与80ms停留上限", helpers.includes("Input.dispatchMouseEvent") && main.includes("enter?.trusted") && main.includes("cancelled.actualHoverMs < 80"));
  return checker.failed;
}
