import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || "eachann1024/thinkly";

export function gh(args, input) {
  return execFileSync("gh", args, {
    cwd: ROOT, encoding: "utf8", input, maxBuffer: 20 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function versionFromTag(tag) {
  return /^v?(\d+\.\d+\.\d+)(?:-[0-9a-f]{7,40})?$/.exec(tag)?.[1];
}

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function getReleases() {
  return gh(["api", "--paginate", `repos/${REPO}/releases?per_page=100`, "--jq", ".[]"])
    .split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

export function assertPublishVersion(version, tag, releases) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Expected a stable x.y.z version");
  for (const release of releases) {
    if (release.tag_name === tag) continue;
    const publishedVersion = versionFromTag(release.tag_name);
    if (!publishedVersion || release.prerelease) continue;
    assert.ok(compareVersions(version, publishedVersion) > 0,
      `${version} must be newer than ${release.tag_name}; increment package.json before publishing`);
  }
}

export function verifyBuildRecords(input, version, sha) {
  const records = new Map();
  for (const [platform, arch] of [["mac", "arm64"], ["mac", "x64"], ["win", "x64"], ["win", "arm64"], ["linux", "x64"]]) {
    const key = `${platform}-${arch}`;
    const record = JSON.parse(readFileSync(resolve(input, `thinkly-${key}-BUILD.json`), "utf8"));
    assert.equal(record.commit, sha, `${key} was built from a different commit`);
    assert.equal(record.version, version, `${key} has a different app version`);
    assert.equal(record.platform, platform, `${key} has a different platform`);
    assert.equal(record.arch, arch, `${key} has a different architecture`);
    assert.ok(Array.isArray(record.files) && record.files.length > 0, `${key} has no installer list`);
    records.set(key, record);
  }
  return records;
}

export function verifyReleaseSource(release, tag, sha) {
  assert.ok(release, `Release ${tag} does not exist`);
  if (release.draft) {
    assert.equal(release.target_commitish, sha, "Draft must target the exact source commit");
    try {
      gh(["api", `repos/${REPO}/git/ref/tags/${tag}`]);
    } catch (error) {
      // A draft may have no tag yet. The refs API reports this specifically as 404.
      if (String(error.stderr).includes("HTTP 404")) return;
      throw error;
    }
  }
  assert.equal(gh(["api", `repos/${REPO}/commits/${tag}`, "--jq", ".sha"]).trim(), sha,
    "Release tag must point to the selected source commit");
}

// Commit the download manifests together; a concurrent main push is retried without overwriting it.
export function publishMetadata(files, tag) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assertPublishVersion(versionFromTag(tag), tag, getReleases().filter((release) => !release.draft));
    const head = JSON.parse(gh(["api", `repos/${REPO}/git/ref/heads/main`])).object.sha;
    const commit = JSON.parse(gh(["api", `repos/${REPO}/git/commits/${head}`]));
    const tree = JSON.parse(gh(["api", "--method", "POST", `repos/${REPO}/git/trees`, "--input", "-"], JSON.stringify({
      base_tree: commit.tree.sha,
      tree: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", content })),
    })));
    if (tree.sha === commit.tree.sha) return;
    const next = JSON.parse(gh(["api", "--method", "POST", `repos/${REPO}/git/commits`, "--input", "-"], JSON.stringify({
      message: `更新 ${tag} 下载信息`, tree: tree.sha, parents: [head],
    })));
    try {
      gh(["api", "--method", "PATCH", `repos/${REPO}/git/refs/heads/main`, "--input", "-"], JSON.stringify({ sha: next.sha, force: false }));
      return;
    } catch (error) {
      if (attempt === 2 || !/409|422/.test(String(error.stderr))) throw error;
    }
  }
}
