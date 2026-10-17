import { MAC_SIGNED, MAC_HELPER_MARKER, MAC_INSTALL_GUIDE, macInstallParagraphs } from "./macos-install-copy.mjs";
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
import { assertPublishVersion, getReleases, gh, publishMetadata, verifyBuildRecords, verifyReleaseSource } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata, releaseInstallers, releaseAssets } from "./desktop-download-metadata.mjs";
import { markedReleaseNotes, versionReleaseNotes } from "./desktop-release-notes.mjs";
import { publishDistribution } from "./distribution/publish.mjs";
export { createUpdateFeed, createCask, releaseInstallers, releaseAssets } from "./desktop-download-metadata.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || "eachann1024/goose-note";

// The get-release-by-tag endpoint never returns drafts, so look releases up in the full list.
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
    await publishDistribution(existingPublished);
    publishMetadata(publishedDownloadMetadata(existingPublished), tag);
    console.log(`Repaired ${tag} metadata; published installers are unchanged.`);
    return;
  }
  assertPublishVersion(version, tag, releases);
  const releaseNotes = versionReleaseNotes(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"), version);
  const input = join(ROOT, "artifacts");
  const stage = mkdtempSync(join(tmpdir(), "goose-release-"));
  try {
    const builds = verifyBuildRecords(input, version, sha);
    const signed = ["arm64", "x64"].every((arch) =>
      builds.get(`mac-${arch}`).signed === true && builds.get(`mac-${arch}`).notarized === true);
    const macHelper = ["arm64", "x64"].every((arch) => builds.get(`mac-${arch}`).macInstallHelper === 1);
    const windowsSigned = ["arm64", "x64"].every((arch) =>
      builds.get(`win-${arch}`).signed === true);
    const installers = releaseInstallers(version);
    const available = readdirSync(input).filter((name) => /\.(exe|dmg|zip|AppImage|deb|rpm|pacman)$/.test(name));
    const unexpected = available.filter((name) => !installers.includes(name));
    assert.deepEqual(unexpected, [], `Unexpected installers would be dropped: ${unexpected.join(", ")}`);
    const hashes = new Map();
    for (const name of installers) {
      assert.ok(existsSync(join(input, name)), `Missing release installer: ${name}`);
      copyFileSync(join(input, name), join(stage, name));
      hashes.set(name, createHash("sha256").update(readFileSync(join(stage, name))).digest("hex"));
    }
    writeFileSync(join(stage, "SHA256SUMS.txt"), installers.map((name) => `${hashes.get(name)}  ${name}\n`).join(""));
    assert.deepEqual(readdirSync(stage).sort(), releaseAssets(version));
    const baseDownloadUrl = `https://github.com/${REPO}/releases/download/${tag}`;
    const notes = [
      markedReleaseNotes(releaseNotes),
      "",
      `### 📥 安装包下载`,
      "",
      "| 平台 | 安装包直接下载 | 架构与说明 |",
      "| :--- | :--- | :--- |",
      `| **macOS** | [Goose.Note-${version}-arm64.dmg](${baseDownloadUrl}/Goose.Note-${encodeURIComponent(version)}-arm64.dmg) | **Apple Silicon（M1 / M2 / M3 / M4 芯片，绝大多数 Mac 选这个）** |`,
      `| | [Goose.Note-${version}.dmg](${baseDownloadUrl}/Goose.Note-${encodeURIComponent(version)}.dmg) | Intel 芯片老款 Mac（文件名无 arm64 后缀） |`,
      `| **Windows** | [Goose.Note-${version}-x64-setup.exe](${baseDownloadUrl}/Goose.Note-${encodeURIComponent(version)}-x64-setup.exe) | **64 位 PC（Intel / AMD，绝大多数 Windows 电脑选这个）** |`,
      `| | [Goose.Note-${version}-arm64-setup.exe](${baseDownloadUrl}/Goose.Note-${encodeURIComponent(version)}-arm64-setup.exe) | 骁龙等 ARM 架构 Windows 设备 |`,
      `| **Linux** | [Goose.Note-${version}.AppImage](${baseDownloadUrl}/Goose.Note-${encodeURIComponent(version)}.AppImage) | 免安装通用版（双击运行） |`,
      `| | [goose-note-app_${version}_amd64.deb](${baseDownloadUrl}/goose-note-app_${encodeURIComponent(version)}_amd64.deb) | Debian / Ubuntu |`,
      `| | [goose-note-app-${version}.pacman](${baseDownloadUrl}/goose-note-app-${encodeURIComponent(version)}.pacman) | Arch Linux / Omarchy（\`sudo pacman -U ./goose-note-app-${version}.pacman\`） |`,
      "",
      "### macOS 安装说明",
      "",
      ...(signed ? [MAC_SIGNED] : macInstallParagraphs(macHelper)),
      ...(macHelper ? [MAC_HELPER_MARKER] : []),
      `[完整安装说明（含旧版 DMG、ZIP 与 Homebrew）](${MAC_INSTALL_GUIDE})`,
      "",
      windowsSigned ? "Windows 安装包已由 SignPath 签名。" : "Windows 暂未做 Authenticode 签名。",
    ].join("\n");
    const existing = findRelease(tag);
    if (!existing) {
      gh(["release", "create", tag, "--repo", REPO, "--target", sha,
        "--title", `Goose Note ${version}`, "--notes", notes, "--draft"]);
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
    // Recheck immediately before marking latest so an older in-flight run cannot downgrade it.
    assertPublishVersion(version, tag, getReleases());
    if (uploaded.draft) gh(["release", "edit", tag, "--repo", REPO, "--draft=false", "--latest"]);
    const published = findRelease(tag);
    verifyReleaseSource(published, tag, sha);
    await publishDistribution(published, { directory: stage });
    publishMetadata(publishedDownloadMetadata(published), tag);
    console.log(`Published and verified ${tag} in ${REPO}.`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
