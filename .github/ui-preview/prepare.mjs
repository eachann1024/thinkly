import { readFile, writeFile, appendFile } from "node:fs/promises";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const repo = process.env.GITHUB_REPOSITORY;
const input = process.env.INPUT_PR?.trim() || String(event.pull_request?.number || "");
if (input && !/^[1-9]\d*$/.test(input)) throw new Error("Invalid PR number");
if (!input && process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Select main for a standalone recording");

async function api(route) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${route}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${route}`);
  return response.json();
}

const pr = input ? await api(`pulls/${input}`) : null;
if (pr && (pr.state !== "open" || pr.base.ref !== "main")) {
  throw new Error("Only open PRs targeting main can be recorded");
}
if (event.pull_request && event.pull_request.head.sha !== pr.head.sha) {
  throw new Error("The PR changed since this run started; use the newer run");
}
const sha = pr?.head.sha || process.env.GITHUB_SHA;
const base = pr?.base.sha;
if (![sha, ...(base ? [base] : [])].every((value) => /^[a-f0-9]{40}$/.test(value))) {
  throw new Error("Invalid source commit");
}

// Optional declarative steps from the PR body are data, never executable JavaScript.
const blocks = [...(pr?.body || "").matchAll(/```ui-preview\s*\n([\s\S]*?)```/g)];
if (blocks.length > 1) throw new Error("Use only one ui-preview block");
const steps = blocks.length ? JSON.parse(blocks[0][1]) : [];
if (!Array.isArray(steps) || steps.length > 40 || JSON.stringify(steps).length > 16_000) {
  throw new Error("Preview steps must be an array of at most 40 short actions");
}
const matrix = {
  include: [
    ...(base ? [{ variant: "before", sha: base }] : []),
    { variant: "after", sha },
  ],
};
await writeFile("preview-input.json", JSON.stringify({ number: Number(input || 0), sha, base, steps }, null, 2));
await appendFile(process.env.GITHUB_OUTPUT, `number=${Number(input || 0)}\nmatrix=${JSON.stringify(matrix)}\n`);
