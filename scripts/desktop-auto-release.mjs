import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareVersions, ROOT } from "./desktop-release-support.mjs";

const BOT_AUTHORS = new Set(["github-actions[bot]", "github-actions"]);
const SKIP_PREFIX = /^(ci|docs|build|test|chore|design|refactor|release)(\([^)]*\))?:/i;
const MAX_AUTO_BULLETS = 80;
const RELEASE_SUBJECT = /^(chore\(release\):|更新 v\d+\.\d+\.\d+-[0-9a-f]+ 下载信息$)/i;
const CONVENTIONAL = /^(feat|fix|perf|refactor|style|test|build|chore|design|revert)(\([^)]*\))?:\s*/i;
export function bumpPatch(version) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

export function nextAutoVersion(packageVersion, publishedVersion) {
  const base = !publishedVersion || compareVersions(packageVersion, publishedVersion) >= 0
    ? packageVersion
    : publishedVersion;
  return bumpPatch(base);
}

export function stripConventionalPrefix(subject) {
  return subject.replace(CONVENTIONAL, "").trim();
}

export function isMetaPath(path) {
  return /^(updates\/|Casks\/|docs\/|\.github\/|scripts\/|designs\/|tests?\/|e2e\/)/.test(path)
    || path === ".gitattributes"
    || path === "CHANGELOG.md"
    || path === "package.json"
    || path === ".gitignore";
}

export function isMetaOnlyPaths(paths) {
  return paths.length > 0 && paths.every((path) => isMetaPath(path));
}

export function isExcludedCommit({ author, subject, paths, releaseNote = "" }) {
  if (BOT_AUTHORS.has(author)) return true;
  if (/^none$/i.test(releaseNote.trim())) return true;
  if (SKIP_PREFIX.test(subject) || RELEASE_SUBJECT.test(subject)) return true;
  if (isMetaOnlyPaths(paths)) return true;
  return false;
}

export function formatChangelogBullets(subjects) {
  const lines = subjects.map((subject) => stripConventionalPrefix(subject).replace(/\s*\(#\d+\)$/, ""));
  return [...new Set(lines)].map((line) => `- ${line}`);
}

export function hasChangelogSection(changelog, version) {
  return new RegExp(`^##[ \\t]+${version.replaceAll(".", "\\.")}[ \\t]*$`, "m")
    .test(changelog.replace(/\r\n?/g, "\n"));
}

export function prependChangelogSection(changelog, version, bullets) {
  assert.ok(bullets.length > 0, "auto-release changelog needs at least one bullet");
  const text = changelog.replace(/\r\n?/g, "\n");
  assert.ok(!hasChangelogSection(text, version), `CHANGELOG.md already has ## ${version}`);
  const section = `## ${version}\n\n${bullets.join("\n")}\n`;
  if (text.startsWith("# 更新日志\n")) {
    return text.replace("# 更新日志\n", `# 更新日志\n\n${section}`);
  }
  return `${section}\n${text}`;
}

export function ensureChangelogSection(changelog, version, bullets) {
  const text = changelog.replace(/\r\n?/g, "\n");
  if (hasChangelogSection(text, version)) return text;
  return prependChangelogSection(text, version, bullets);
}

export function setPackageJsonVersion(text, version) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.ok(/^[ \t]*"version"[ \t]*:/m.test(text), "package.json is missing a version field");
  const updated = text.replace(/^([ \t]*"version"[ \t]*:[ \t]*)"(?:\\.|[^"\\])*"/m, `$1"${version}"`);
  assert.equal(JSON.parse(updated).version, version, "failed to set package.json version");
  return updated;
}

export function writePackageVersion(root, version) {
  const path = resolve(root, "package.json");
  writeFileSync(path, setPackageJsonVersion(readFileSync(path, "utf8"), version));
}

export function writeReleasePlan(root, plan) {
  writeFileSync(resolve(root, "release-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
}

export function applyReleasePlan(root, plan) {
  assert.match(plan.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  const packagePath = resolve(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  if (pkg.version !== plan.version) writePackageVersion(root, plan.version);
  if (!plan.autoBump) return;
  assert.ok(Array.isArray(plan.bullets) && plan.bullets.length > 0, "autoBump plan needs changelog bullets");
  const changelogPath = resolve(root, "CHANGELOG.md");
  writeFileSync(changelogPath, ensureChangelogSection(readFileSync(changelogPath, "utf8"), plan.version, plan.bullets));
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

export function listCommitsSince(root, sinceSha, untilSha = "HEAD") {
  const log = git(root, [
    "log", "--no-merges", "--reverse",
    "--format=%H%x00%an%x00%s%x00%(trailers:key=Release-Note,valueonly,separator=%x20)", `${sinceSha}..${untilSha}`,
  ]);
  if (!log) return [];
  return log.split("\n").filter(Boolean).map((line) => {
    const [sha, author, subject, releaseNote = ""] = line.split("\x00");
    const paths = git(root, ["diff-tree", "--no-commit-id", "--name-only", "-r", sha])
      .split("\n").filter(Boolean);
    return { sha, author, subject, releaseNote: releaseNote.trim(), paths };
  });
}

export function userFacingCommits(commits) {
  return commits.filter((commit) => !isExcludedCommit(commit));
}

function isAncestor(root, sha, head) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, head], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// main 被改写历史后，上一版的 target_commitish 不再是 HEAD 的祖先，`A..HEAD` 会把整段旧历史全列进来。
// 这时改用 HEAD 上「更新 <tag> 下载信息」那次回写提交作为起点；找不到就报错，不再生成超长日志。
export function resolveScanBase({ root = ROOT, previousSha, previousTag, headSha = "HEAD" }) {
  if (isAncestor(root, previousSha, headSha)) return previousSha;
  const subject = previousTag ? `更新 ${previousTag} 下载信息` : "";
  const found = subject
    ? git(root, ["log", "--first-parent", "--format=%H", "-F", `--grep=${subject}`, "-n", "1", headSha])
    : "";
  assert.ok(found, `上一版提交 ${previousSha} 不在当前 main 历史里，且找不到「${subject}」，请人工指定日志起点`);
  return found;
}

export function planAutoRelease({ packageVersion, publishedVersion, previousSha, previousTag, root = ROOT, headSha }) {
  assert.ok(previousSha, "need the previous release commit to scan changes");
  const base = resolveScanBase({ root, previousSha, previousTag, headSha: headSha || "HEAD" });
  const commits = listCommitsSince(root, base, headSha);
  const user = userFacingCommits(commits);
  if (user.length === 0) {
    return { autoBump: false, version: packageVersion, bullets: [], subjects: [], commits: [], skipped: true };
  }
  const version = nextAutoVersion(packageVersion, publishedVersion);
  const subjects = user.map((commit) => commit.releaseNote || commit.subject);
  assert.ok(subjects.length <= MAX_AUTO_BULLETS,
    `自动日志有 ${subjects.length} 条，超过 ${MAX_AUTO_BULLETS} 条，扫描范围可能有误`);
  return {
    autoBump: true,
    version,
    subjects,
    commits: user.map(({ subject, releaseNote }) => ({ subject, releaseNote })),
    bullets: formatChangelogBullets(subjects),
    skipped: false,
  };
}
