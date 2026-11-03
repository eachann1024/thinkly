import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureChangelogSection, setPackageJsonVersion } from "./desktop-auto-release.mjs";
import { assertPublishVersion, getReleases, gh, publishMetadata, readRepoFile, verifyBuildRecords, verifyReleaseSource } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata, publishedPayloads, releaseAssets } from "./desktop-download-metadata.mjs";
import { markedReleaseNotes, versionReleaseNotes } from "./desktop-release-notes.mjs";
export { createUpdateFeed, createCask, releaseInstallers, releaseAssets } from "./desktop-download-metadata.mjs";

// Release bodies carry only the user-facing changelog; downloads live on the website and in the assets list.
export function formatReleaseBody({ releaseNotes }) {
  return markedReleaseNotes(releaseNotes);
}

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || "eachann1024/thinkly";

export function pickRelease(lines, tag) {
  const found = lines.split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((release) => release.tag_name === tag);
  assert.ok(found.length <= 1, `Multiple releases use tag ${tag}`);
  return found[0];
}

function findRelease(tag) {
  return pickRelease(gh(["api", "--paginate", `repos/${REPO}/releases?per_page=100`, "--jq", ".[]"]), tag);
}

async function main() {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const sha = process.env.GITHUB_SHA || gh(["api", `repos/${REPO}/commits/main`, "--jq", ".sha"]).trim();
  assert.match(sha, /^[a-f0-9]{40}$/, "Expected an exact source commit");
  const tag = `v${version}-${sha.slice(0, 7)}`;
  const releases = getReleases();
  const existingPublished = releases.find((release) => release.tag_name === tag && !release.draft);
  if (existingPublished) {
    assertPublishVersion(version, tag, releases.filter((release) => !release.draft));
    verifyReleaseSource(existingPublished, tag, sha);
    publishMetadata(publishedDownloadMetadata(existingPublished), tag);
    console.log(`Repaired ${tag} metadata; published installers are unchanged.`);
    return;
  }
  assertPublishVersion(version, tag, releases);
  const releaseNotes = versionReleaseNotes(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"), version);
  const input = join(ROOT, "artifacts");
  const stage = mkdtempSync(join(tmpdir(), "thinkly-release-"));
  try {
    verifyBuildRecords(input, version, sha);
    const payloads = publishedPayloads(version);
    const available = readdirSync(input).filter((name) => /\.(exe|dmg|zip|AppImage|deb|rpm|pacman|blockmap|yml)$/.test(name));
    const unexpected = available.filter((name) => !payloads.includes(name));
    assert.deepEqual(unexpected, [], `Unexpected release files would be dropped: ${unexpected.join(", ")}`);
    const hashes = new Map();
    for (const name of payloads) {
      assert.ok(existsSync(join(input, name)), `Missing release file: ${name}`);
      copyFileSync(join(input, name), join(stage, name));
      hashes.set(name, createHash("sha256").update(readFileSync(join(stage, name))).digest("hex"));
    }
    writeFileSync(join(stage, "SHA256SUMS.txt"), payloads.map((name) => `${hashes.get(name)}  ${name}\n`).join(""));
    assert.deepEqual(readdirSync(stage).sort(), releaseAssets(version));
    const notes = formatReleaseBody({ releaseNotes });
    const existing = findRelease(tag);
    if (!existing) {
      gh(["release", "create", tag, "--repo", REPO, "--target", sha,
        "--title", `Thinkly ${version}`, "--notes", notes, "--draft"]);
    } else if (existing.draft) {
      gh(["release", "edit", tag, "--repo", REPO, "--notes", notes]);
    }
    if (!existing || existing.draft) {
      gh(["release", "upload", tag, "--repo", REPO, "--clobber",
        ...readdirSync(stage).map((name) => join(stage, name))]);
    }
    const uploaded = findRelease(tag);
    assert.ok(uploaded, `Release ${tag} not found after upload`);
    assert.deepEqual(uploaded.assets.map((asset) => asset.name).sort(), releaseAssets(version),
      "Release assets must match the release allowlist exactly");
    verifyReleaseSource(uploaded, tag, sha);
    for (const [name, digest] of hashes) {
      const asset = uploaded.assets.find((item) => item.name === name);
      if (!existing || existing.draft) {
        assert.equal(asset?.digest, `sha256:${digest}`, `Uploaded checksum mismatch: ${name}`);
      } else {
        assert.match(asset?.digest ?? "", /^sha256:[a-f0-9]{64}$/, `Missing published checksum: ${name}`);
        hashes.set(name, asset.digest.slice("sha256:".length));
      }
    }
    assertPublishVersion(version, tag, getReleases());
    if (uploaded.draft) gh(["release", "edit", tag, "--repo", REPO, "--draft=false", "--latest"]);
    const published = findRelease(tag);
    verifyReleaseSource(published, tag, sha);
    const files = publishedDownloadMetadata(published);
    let resolveFiles;
    if (process.env.AUTO_BUMP === "true") {
      const plan = JSON.parse(readFileSync(join(ROOT, "release-plan.json"), "utf8"));
      assert.equal(plan.version, version, "release-plan version must match the published build");
      assert.ok(Array.isArray(plan.bullets) && plan.bullets.length > 0, "autoBump writeback needs changelog bullets");
      resolveFiles = (head) => ({
        "package.json": setPackageJsonVersion(readRepoFile(head, "package.json"), version),
        "CHANGELOG.md": ensureChangelogSection(readRepoFile(head, "CHANGELOG.md"), version, plan.bullets),
      });
    }
    publishMetadata(files, tag, resolveFiles ? { resolveFiles } : {});
    console.log(`Published and verified ${tag} in ${REPO}.`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
