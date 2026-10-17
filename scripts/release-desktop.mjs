#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { assertPublishVersion, getReleases, gh, REPO, ROOT } from "./desktop-release-support.mjs";
import { versionReleaseNotes } from "./desktop-release-notes.mjs";

// Publishes the committed and pushed main revision. Unrelated local edits are never uploaded.
const args = process.argv.slice(2);
assert.ok(args.every((arg) => arg === "--watch"), "Usage: node scripts/release-desktop.mjs [--watch]");
const git = (...values) => execFileSync("git", values, { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "main", "Desktop releases must use main");
const sha = git("rev-parse", "HEAD");
assert.equal(gh(["api", `repos/${REPO}/commits/main`, "--jq", ".sha"]).trim(), sha,
  "Push the release commit to main before publishing");
const { version } = JSON.parse(git("show", "HEAD:package.json"));
versionReleaseNotes(git("show", "HEAD:CHANGELOG.md"), version);
const tag = `v${version}-${sha.slice(0, 7)}`;
const releases = getReleases();
const published = releases.some((release) => release.tag_name === tag && !release.draft);
assertPublishVersion(version, tag, published ? releases.filter((release) => !release.draft) : releases);
const existing = JSON.parse(gh(["run", "list", "--repo", REPO, "--workflow", "desktop-build.yml", "--commit", sha,
  "--event", "workflow_dispatch", "--json", "databaseId,status,url", "--limit", "20"]));
const active = existing.find((run) => run.status !== "completed");
assert.ok(!active, `A build is already running: ${active?.url}`);
const dispatchedAt = Date.now() - 5_000;
gh(["workflow", "run", "desktop-build.yml", "--repo", REPO, "--ref", "main", "--field", "publish=true", "--field", `expected_sha=${sha}`]);
console.log(`Requested Goose Note ${version} (${sha.slice(0, 7)}) publication.`);
for (let attempt = 0; attempt < 15; attempt += 1) {
  const runs = JSON.parse(gh(["run", "list", "--repo", REPO, "--workflow", "desktop-build.yml", "--commit", sha,
    "--event", "workflow_dispatch", "--json", "databaseId,createdAt,url", "--limit", "20"]));
  const run = runs.find((item) => Date.parse(item.createdAt) >= dispatchedAt);
  if (run) {
    console.log(run.url);
    if (args.includes("--watch")) {
      execFileSync("gh", ["run", "watch", String(run.databaseId), "--repo", REPO, "--exit-status"], { cwd: ROOT, stdio: "inherit" });
      console.log(`Release: https://github.com/${REPO}/releases/tag/${tag}`);
    }
    process.exit(0);
  }
  await setTimeout(2_000);
}
throw new Error(`Workflow accepted but its run is not visible yet: https://github.com/${REPO}/actions/workflows/desktop-build.yml`);
