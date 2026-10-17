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
const scheduled = process.env.GITHUB_EVENT_NAME === "schedule";
const publish = process.env.GITHUB_REF === "refs/heads/main" && (scheduled || process.env.PUBLISH === "true");
let build = true;
let repair = false;
let releaseTag = "";
if (publish) {
  versionReleaseNotes(readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8"), version);
  const releases = getReleases();
  const previous = releases.filter((release) => !release.draft && !release.prerelease && versionFromTag(release.tag_name))
    .sort((left, right) => compareVersions(versionFromTag(left.tag_name), versionFromTag(right.tag_name))).at(-1);
  const samePublished = releases.find((release) => !release.draft && release.tag_name === tag);
  if (samePublished || (scheduled && previous && compareVersions(version, versionFromTag(previous.tag_name)) <= 0)) {
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
appendFileSync(process.env.GITHUB_OUTPUT, `build=${build}\npublish=${build && publish}\nrepair=${repair}\nrelease_tag=${releaseTag}\n`);
console.log(`Selected Goose Note ${version}: build=${build}, publish=${build && publish}`);
