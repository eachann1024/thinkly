import assert from "node:assert/strict";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyReleasePlan, planAutoRelease, writeReleasePlan } from "./desktop-auto-release.mjs";
import { assertPublishVersion, compareVersions, getReleases, ROOT, versionFromTag } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata } from "./desktop-download-metadata.mjs";
import { versionReleaseNotes } from "./desktop-release-notes.mjs";

const expectedSha = process.env.EXPECTED_SHA;
assert.ok(!expectedSha || expectedSha === process.env.GITHUB_SHA, "main changed after release preflight; retry from the pushed revision");
const packageVersion = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version;
const onMain = process.env.GITHUB_REF === "refs/heads/main";
const scheduled = process.env.GITHUB_EVENT_NAME === "schedule";
const force = process.env.FORCE === "true";
let publish = onMain && (scheduled || process.env.PUBLISH === "true" || force);
let build = true;
let repair = false;
let releaseTag = "";
let version = packageVersion;
let autoBump = false;
let plan = { version: packageVersion, autoBump: false, bullets: [] };

if (onMain) {
  const releases = getReleases();
  const stable = releases.filter((release) => !release.draft && !release.prerelease && versionFromTag(release.tag_name))
    .sort((left, right) => compareVersions(versionFromTag(left.tag_name), versionFromTag(right.tag_name)));
  const previous = stable.at(-1);
  const publishedVersion = previous ? versionFromTag(previous.tag_name) : null;
  const notNewer = previous && compareVersions(packageVersion, publishedVersion) <= 0;
  const sameVersion = releases.find((release) => !release.draft && new RegExp(`^v${packageVersion.replaceAll(".", "\\.")}(?:-|$)`).test(release.tag_name));

  if (notNewer && !force) {
    const previousSha = /^[0-9a-f]{40}$/i.test(previous.target_commitish ?? "")
      ? previous.target_commitish
      : null;
    assert.ok(previousSha, `release ${previous.tag_name} target_commitish must be a full commit sha`);
    const auto = planAutoRelease({
      packageVersion, publishedVersion, previousSha, headSha: process.env.GITHUB_SHA,
    });
    if (auto.autoBump) {
      version = auto.version;
      autoBump = true;
      plan = { version, autoBump: true, bullets: auto.bullets, subjects: auto.subjects };
      applyReleasePlan(ROOT, plan);
      console.log(`自动升版本 ${packageVersion} → ${version}（自 ${previous.tag_name} 起有 ${auto.subjects.length} 条面向用户提交）`);
    } else {
      build = false;
      publish = false;
      repair = false;
      releaseTag = (sameVersion ?? previous).tag_name;
      const line = `版本 ${packageVersion} 已有 release ${releaseTag}，且无面向用户的新提交，跳过构建`;
      console.log(line);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
    }
  } else if (notNewer && force) {
    publish = false;
    releaseTag = (sameVersion ?? previous).tag_name;
    console.log(`force：版本 ${packageVersion} 已有 release ${releaseTag}，只强制构建`);
  }

  if (build && publish) {
    const tag = `v${version}-${process.env.GITHUB_SHA.slice(0, 7)}`;
    versionReleaseNotes(readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8"), version);
    const samePublished = releases.find((release) => !release.draft && release.tag_name === tag);
    if (samePublished) {
      build = false;
      const published = samePublished ?? previous;
      const files = publishedDownloadMetadata(published);
      repair = Object.entries(files).some(([path, content]) =>
        !existsSync(resolve(ROOT, path)) || readFileSync(resolve(ROOT, path), "utf8") !== content);
      releaseTag = published.tag_name;
      console.log(`${releaseTag} is already published; metadata repair=${repair}.`);
    } else {
      assertPublishVersion(version, tag, releases);
    }
  }
}

writeReleasePlan(ROOT, plan);
const shouldBuild = build;
appendFileSync(process.env.GITHUB_OUTPUT,
  `should_build=${shouldBuild}\nbuild=${shouldBuild}\npublish=${shouldBuild && publish}\nrepair=${repair}\nrelease_tag=${releaseTag}\nversion=${version}\nauto_bump=${autoBump}\n`);
console.log(`Selected Thinkly ${version}: should_build=${shouldBuild}, publish=${shouldBuild && publish}, auto_bump=${autoBump}`);
