import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

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
const status = completed ? "Recorded steps completed" : "Incomplete evidence — review the failed or skipped steps";
const summary = `## UI preview: ${manifest.variant}\n\n${status}\n\n` +
  `Commit: \`${manifest.sha}\`\n\n` +
  `| Build | Screenshot count | Recorded flow |\n| --- | --- | --- |\n` +
  `| ${manifest.build} | ${manifest.screenshots.length} | ${manifest.flow} |\n\n` +
  `Download the \`ui-preview-pr-…-${manifest.variant}-…\` artifact and open \`index.html\`.\n\n` +
  `This is Linux desktop evidence for the listed actions, not approval of every changed feature.\n`;
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(out, "summary.md"), summary);
await writeFile(join(out, "index.html"), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Goose Note PR UI preview</title>
<style>body{max-width:1280px;margin:40px auto;padding:0 24px;background:#f5f3ed;color:#242720;font:16px/1.6 Georgia,serif}
h1{font-size:36px}code{overflow-wrap:anywhere}li{margin:8px 0}img{width:100%;border:1px solid #d2d5cb;border-radius:8px}
figure{margin:32px 0}figcaption{margin:8px 0} .status{padding:16px;background:${completed ? "#e0ebda" : "#f5dfd1"}}</style>
<h1>Goose Note · ${escape(manifest.variant)}</h1><p class="status">${escape(status)}</p>
<p>Commit: <code>${escape(manifest.sha)}</code> · Linux / Electron</p>
<p>Build: ${escape(manifest.build)} · Screenshots: ${manifest.screenshots.length} · Flow: ${escape(manifest.flow)}</p>
<h2>Actions</h2><ol>${manifest.steps.map((item) =>
    `<li>${escape(item.name)} — ${escape(item.status)}${item.error ? `: ${escape(item.error)}` : ""}</li>`).join("")}</ol>
${manifest.screenshots.map((item) => `<figure><img src="${escape(item.file)}" alt="${escape(item.caption)}"><figcaption>${escape(item.caption)}</figcaption></figure>`).join("")}
<h2>Errors</h2><ul>${manifest.errors.map((error) => `<li>${escape(error)}</li>`).join("") || "<li>None recorded</li>"}</ul>
<h2>Not covered</h2><ul>${(manifest.notCovered || ["No desktop interactions completed"]).map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
<p>Screenshots require human review. Only the listed actions were recorded.</p></html>`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
