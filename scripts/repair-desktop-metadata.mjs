import assert from "node:assert/strict";
import { assertPublishVersion, findReleaseByTag, getReleases, publishMetadata, versionFromTag } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata } from "./desktop-download-metadata.mjs";

const tag = process.argv[2];
assert.ok(versionFromTag(tag ?? ""), "Expected the published release tag to repair");
const releases = getReleases();
const candidate = releases.find((item) => item.tag_name === tag && !item.draft) ?? findReleaseByTag(tag);
const release = candidate && !candidate.draft ? candidate : undefined;
assert.ok(release, `Published release ${tag} does not exist`);
assertPublishVersion(versionFromTag(tag), tag, releases.filter((item) => !item.draft));
publishMetadata(publishedDownloadMetadata(release), tag);
console.log(`Repaired ${tag} update feeds without rebuilding or replacing installers.`);
