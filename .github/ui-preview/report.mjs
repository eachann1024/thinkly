import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { zh } from "./report-zh.mjs";

const out = resolve(process.argv[2]);
await mkdir(out, { recursive: true });
let manifest;
try {
  manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
} catch {
  manifest = { flow: "not-run", steps: [], screenshots: [], errors: ["No interaction record was produced"] };
}
manifest.sha = process.env.SOURCE_SHA;
manifest.variant = process.env.PREVIEW_VARIANT;
manifest.build = process.env.BUILD_OUTCOME || "unknown";
manifest.record = process.env.RECORD_OUTCOME || "not-run";
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const completed = manifest.build === "success" && manifest.record === "success" && manifest.flow === "completed";
const status = completed ? "所列操作步骤已完成" : "验收证据不完整，请检查失败或跳过的步骤";
const summary = `## 界面预览：${zh(manifest.variant)}\n\n${status}\n\n` +
  `提交：\`${manifest.sha}\`\n\n` +
  `| 构建结果 | 截图数量 | 操作流程 |\n| --- | --- | --- |\n` +
  `| ${zh(manifest.build)} | ${manifest.screenshots.length} | ${zh(manifest.flow)} |\n\n` +
  `下载 \`ui-preview-pr-…-${manifest.variant}-…\` 产物，解压后打开 \`index.html\`。\n\n` +
  `本报告仅记录所列操作在 Linux 桌面环境中的执行情况，不代表所有改动均已验收通过。\n`;
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(out, "summary.md"), summary);
await writeFile(join(out, "index.html"), `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Goose Note PR 界面预览报告</title>
<style>body{max-width:1280px;margin:40px auto;padding:0 24px;background:#f5f3ed;color:#242720;font:16px/1.6 Georgia,serif}
h1{font-size:36px}code{overflow-wrap:anywhere}li{margin:8px 0}img{width:100%;border:1px solid #d2d5cb;border-radius:8px}
figure{margin:32px 0}figcaption{margin:8px 0} .status{padding:16px;background:${completed ? "#e0ebda" : "#f5dfd1"}}</style>
<h1>Goose Note · ${escape(zh(manifest.variant))}界面预览</h1><p class="status">${escape(status)}</p>
<p>提交：<code>${escape(manifest.sha)}</code> · 运行环境：Linux / Electron</p>
<p>构建：${escape(zh(manifest.build))} · 截图：${manifest.screenshots.length} 张 · 操作流程：${escape(zh(manifest.flow))}</p>
<h2>操作步骤</h2><ol>${manifest.steps.map((item) =>
    `<li>${escape(zh(item.name))} — ${escape(zh(item.status))}${item.error ? `：${escape(zh(item.error))}` : ""}</li>`).join("")}</ol>
${manifest.screenshots.map((item) => `<figure><img src="${escape(item.file)}" alt="${escape(zh(item.caption))}"><figcaption>${escape(zh(item.caption))}</figcaption></figure>`).join("")}
<h2>错误记录</h2><ul>${manifest.errors.map((error) => `<li>${escape(zh(error))}</li>`).join("") || "<li>未记录到操作错误</li>"}</ul>
<h2>未覆盖范围</h2><ul>${(manifest.notCovered || ["No desktop interactions completed"]).map((item) => `<li>${escape(zh(item))}</li>`).join("")}</ul>
<p>本报告仅记录上述实际操作，截图仍需人工审核。</p></html>`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
