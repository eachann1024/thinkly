import { readFile } from "node:fs/promises";
import { zh } from "./report-zh.mjs";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const run = event.workflow_run;
const repo = process.env.GITHUB_REPOSITORY;
const marker = "<!-- goose-ui-preview -->";

async function api(route, body) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${route}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${route}`);
  return response.json();
}

if (run.path !== ".github/workflows/ui-preview.yml" || !["pull_request", "workflow_dispatch"].includes(run.event)) {
  throw new Error("Unexpected source workflow");
}
const { artifacts } = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
const parsed = artifacts.map((artifact) => ({
  artifact, match: /^ui-preview-pr-([1-9]\d*)-(before|after)-([a-f0-9]{40})$/.exec(artifact.name),
})).filter((item) => item.match);
const after = parsed.find((item) => item.match[2] === "after");
if (after) {
  const number = Number(after.match[1]);
  const pr = await api(`pulls/${number}`);
  const matchesRun = run.display_title === `PR UI preview #${number}` &&
    (run.event === "workflow_dispatch"
      ? run.head_branch === "main"
      : [pr.head.sha, pr.merge_commit_sha].includes(run.head_sha) && run.head_branch === pr.head.ref);
  if (pr.state !== "open" || pr.head.sha !== after.match[3] || !matchesRun) {
    console.log("No comment: evidence belongs to an old or unrelated PR revision");
  } else {
    const links = parsed.filter((item) => item.match[1] === String(number) && !item.artifact.expired)
      .map(({ artifact, match }) =>
        `- ${match[2] === "before" ? "改前" : "改后"}截图与操作记录：` +
        `[下载报告](${run.html_url}/artifacts/${artifact.id}) · \`${match[3].slice(0, 8)}\``);
    const body = `${marker}\n### 界面预览\n\n` +
      `云端运行：**${zh(run.conclusion)}** · 当前 PR 提交：\`${pr.head.sha.slice(0, 8)}\`\n\n` +
      `${links.join("\n")}\n\n` +
      `解压后打开 \`index.html\` 查看截图、逐步结果和未覆盖项；` +
      `运行成功仅表示列出的操作完成，仍需人工核对改动效果。\n\n[构建与运行日志](${run.html_url})`;
    // Update one bot-owned comment rather than spamming each new commit.
    let previous;
    for (let page = 1; page <= 10 && !previous; page++) {
      const comments = await api(`issues/${number}/comments?per_page=100&page=${page}`);
      previous = comments.find((comment) => comment.user?.login === "github-actions[bot]" && comment.body.startsWith(marker));
      if (comments.length < 100) break;
    }
    if (previous) {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues/comments/${previous.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body }), signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Update preview comment: GitHub ${response.status}`);
    } else await api(`issues/${number}/comments`, { body });
  }
} else console.log("No PR artifact to publish (main-only run or failed setup)");
