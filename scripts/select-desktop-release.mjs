import assert from "node:assert/strict";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertPublishVersion, compareVersions, getReleases, ROOT, versionFromTag } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata } from "./desktop-download-metadata.mjs";
import { versionReleaseNotes } from "./desktop-release-notes.mjs";

const expectedSha = process.env.EXPECTED_SHA;
assert.ok(!expectedSha || expectedSha === process.env.GITHUB_SHA, "main changed after release preflight; retry from the pushed revision");
const { version } = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const tag = `v${version}-${process.env.GITHUB_SHA.slice(0, 7)}`;
const onMain = process.env.GITHUB_REF === "refs/heads/main";
const scheduled = process.env.GITHUB_EVENT_NAME === "schedule";
const force = process.env.FORCE === "true";
let publish = onMain && (scheduled || process.env.PUBLISH === "true" || force);
let build = true;
let repair = false;
let releaseTag = "";
if (onMain) {
  const releases = getReleases();
  const stable = releases.filter((release) => !release.draft && !release.prerelease && versionFromTag(release.tag_name))
    .sort((left, right) => compareVersions(versionFromTag(left.tag_name), versionFromTag(right.tag_name)));
  const previous = stable.at(-1);
  const sameVersion = releases.find((release) => !release.draft && new RegExp(`^v${version.replaceAll(".", "\\.")}(?:-|$)`).test(release.tag_name));
  const notNewer = previous && compareVersions(version, versionFromTag(previous.tag_name)) <= 0;
  if ((sameVersion || notNewer) && !force) {
    build = false;
    publish = false;
    repair = false;
    releaseTag = (sameVersion ?? previous).tag_name;
    const line = `版本 ${version} 已有 release ${releaseTag}，跳过构建和夸克上传`;
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  } else if (sameVersion || notNewer) {
    publish = false;
    releaseTag = (sameVersion ?? previous).tag_name;
    console.log(`force：版本 ${version} 已有 release ${releaseTag}，只强制构建`);
  } else if (publish) {
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
const shouldBuild = build;
appendFileSync(process.env.GITHUB_OUTPUT, `should_build=${shouldBuild}\nbuild=${shouldBuild}\npublish=${shouldBuild && publish}\nrepair=${repair}\nrelease_tag=${releaseTag}\n`);
console.log(`Selected Thinkly ${version}: should_build=${shouldBuild}, publish=${shouldBuild && publish}`);
