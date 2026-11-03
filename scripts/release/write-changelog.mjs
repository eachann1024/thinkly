import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  ensureChangelogSection, hasChangelogSection, listCommitsSince, planAutoRelease, userFacingCommits,
} from "../desktop-auto-release.mjs";
import { compareVersions, getReleases, ROOT, versionFromTag } from "../desktop-release-support.mjs";
import { fallbackNotice, polishChangelog } from "./polish-changelog.mjs";

// 发版前在本机生成 gemini 3.8 润色的更新日志。
//   node scripts/release/write-changelog.mjs            预览下一版日志（从最新正式版起算）
//   node scripts/release/write-changelog.mjs --write    写入 CHANGELOG.md，提交推送后 CI 发版会沿用
//   --from <提交> [--to <提交>] --version <x.y.z>        指定范围试跑
// 需要环境变量 MAGPIE_BASE_URL（以及网关要求时的 MAGPIE_API_KEY），可选 CHANGELOG_MODEL。
const { values } = parseArgs({
  options: {
    from: { type: "string" }, to: { type: "string", default: "HEAD" },
    version: { type: "string" }, write: { type: "boolean", default: false },
  },
});

function nextRelease() {
  const packageVersion = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version;
  const previous = getReleases()
    .filter((release) => !release.draft && !release.prerelease && versionFromTag(release.tag_name))
    .sort((left, right) => compareVersions(versionFromTag(left.tag_name), versionFromTag(right.tag_name)))
    .at(-1);
  assert.ok(previous, "找不到已发布的正式版，请用 --from 指定起点");
  const auto = planAutoRelease({
    packageVersion,
    publishedVersion: versionFromTag(previous.tag_name),
    previousSha: previous.target_commitish,
    previousTag: previous.tag_name,
    headSha: values.to,
  });
  assert.ok(auto.autoBump, `自 ${previous.tag_name} 起没有面向用户的提交`);
  return { version: values.version || auto.version, commits: auto.commits };
}

function rangeRelease() {
  assert.ok(values.version, "--from 需要同时给 --version");
  const commits = userFacingCommits(listCommitsSince(ROOT, values.from, values.to))
    .map(({ subject, releaseNote }) => ({ subject, releaseNote }));
  return { version: values.version, commits };
}

const { version, commits } = values.from ? rangeRelease() : nextRelease();
console.error(`Thinkly ${version}：${commits.length} 条面向用户的提交交给模型整理`);
const result = await polishChangelog({ version, commits });
if (result.status !== "polished") {
  console.error(fallbackNotice(result.status === "empty" ? "模型判断没有用户可感知的改动" : result.reason));
  process.exit(1);
}
console.error(`模型：${result.model}`);
console.log(result.lines.join("\n"));
if (values.write) {
  const path = resolve(ROOT, "CHANGELOG.md");
  const changelog = readFileSync(path, "utf8");
  assert.ok(!hasChangelogSection(changelog, version), `CHANGELOG.md 已有 ## ${version}，请先删掉旧段落再写入`);
  writeFileSync(path, ensureChangelogSection(changelog, version, result.lines));
  console.error(`已写入 CHANGELOG.md 的 ## ${version}`);
}
