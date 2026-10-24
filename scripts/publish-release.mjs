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
import { ensureChangelogSection, setPackageJsonVersion } from "./desktop-auto-release.mjs";
import { assertPublishVersion, compareVersions, getReleases, gh, publishMetadata, readRepoFile, verifyBuildRecords, verifyReleaseSource } from "./desktop-release-support.mjs";
import { publishedDownloadMetadata, releaseInstallers, releaseAssets } from "./desktop-download-metadata.mjs";
import { markedReleaseNotes, versionReleaseNotes } from "./desktop-release-notes.mjs";
export { createUpdateFeed, createCask, releaseInstallers, releaseAssets } from "./desktop-download-metadata.mjs";

const MANUAL_UPGRADE_VERSION = "1.7.318";

function manualUpgradeNotes(version) {
  if (compareVersions(version, MANUAL_UPGRADE_VERSION) < 0) return [];
  return [
    "### 从 1.7.317 升级",
    "",
    "应用已正式改名为 Thinkly（磁盘上是 Thinkly.app，安装包文件名 Thinkly-*）。",
    "",
    "- 1.7.317 及更早版本无法在应用内自动升级，请到官网或 GitHub Release 手动下载安装一次；装好后可以删掉旧的 Goose Note.app。",
    "- macOS 辅助功能等系统权限需要重新授权。",
    "- 首次启动会自动把原数据目录迁移过来，笔记和设置不受影响。",
    "- Homebrew 用户 `brew update && brew upgrade` 会自动迁到 thinkly cask。",
    "",
  ];
}

export function formatReleaseBody({ version, releaseNotes, repo, tag, signed, macHelper, windowsSigned }) {
  const baseDownloadUrl = `https://github.com/${repo}/releases/download/${tag}`;
  return [
    markedReleaseNotes(releaseNotes),
    "",
    ...manualUpgradeNotes(version),
    `### 📥 安装包下载`,
    "",
    "| 平台 | 安装包直接下载 | 架构与说明 |",
    "| :--- | :--- | :--- |",
    `| **macOS** | [Thinkly-${version}-arm64.dmg](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}-arm64.dmg) | **Apple Silicon（M1 / M2 / M3 / M4 芯片，绝大多数 Mac 选这个）** |`,
    `| | [Thinkly-${version}.dmg](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}.dmg) | Intel 芯片老款 Mac（文件名无 arm64 后缀） |`,
    `| **Windows** | [Thinkly-${version}-x64-setup.exe](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}-x64-setup.exe) | **64 位 PC（Intel / AMD，绝大多数 Windows 电脑选这个）** |`,
    `| | [Thinkly-${version}-arm64-setup.exe](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}-arm64-setup.exe) | 骁龙等 ARM 架构 Windows 设备 |`,
    `| **Linux** | [Thinkly-${version}.AppImage](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}.AppImage) | 免安装通用版（双击运行） |`,
    `| | [Thinkly_${version}_amd64.deb](${baseDownloadUrl}/Thinkly_${encodeURIComponent(version)}_amd64.deb) | Debian / Ubuntu |`,
    `| | [Thinkly-${version}.pacman](${baseDownloadUrl}/Thinkly-${encodeURIComponent(version)}.pacman) | Arch Linux / Omarchy（\`sudo pacman -U ./Thinkly-${version}.pacman\`） |`,
    "",
    "### macOS 安装说明",
    "",
    ...(signed ? [MAC_SIGNED] : macInstallParagraphs(macHelper)),
    ...(macHelper ? [MAC_HELPER_MARKER] : []),
    `[完整安装说明（含旧版 DMG、ZIP 与 Homebrew）](${MAC_INSTALL_GUIDE})`,
    "",
    windowsSigned ? "Windows 安装包已由 SignPath 签名。" : "Windows 暂未做 Authenticode 签名。",
  ].join("\n");
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
    const notes = formatReleaseBody({
      version, releaseNotes, repo: REPO, tag, signed, macHelper, windowsSigned,
    });
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
