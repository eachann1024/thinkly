import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REPO, versionFromTag } from "./desktop-release-support.mjs";
import { publishedReleaseNotes } from "./desktop-release-notes.mjs";

export function releaseInstallers(version) {
  return [
    `Thinkly-${version}-arm64.dmg`, `Thinkly-${version}.dmg`,
    `Thinkly-${version}-arm64-mac.zip`, `Thinkly-${version}-mac.zip`,
    `Thinkly-${version}-x64-setup.exe`, `Thinkly-${version}-arm64-setup.exe`,
    `Thinkly-${version}.AppImage`, `Thinkly_${version}_amd64.deb`,
    `Thinkly-${version}.pacman`,
  ];
}

export function releaseAssets(version) {
  return [...releaseInstallers(version), "SHA256SUMS.txt"].sort();
}

export function createUpdateFeed(tag, assets, hashes, repo = REPO, releaseNotes = "", publishedAt = "") {
  // 已发布客户端按后缀选包，不看 Goose.Note 前缀。信任校验比对的是这条地址原文，不跟随重定向：
  // v1.7.240 起只接受 goose-notes，v1.7.317 同时接受 goose-note。下载本身由 fetch 跟随 301 到 thinkly。
  const downloadRepo = repo === "eachann1024/thinkly" || repo === "eachann1024/goose-note"
    ? "eachann1024/goose-notes"
    : repo;
  return {
    tag_name: tag, html_url: `https://github.com/${repo}/releases/tag/${tag}`,
    releaseNotes, publishedAt,
    assets: assets.map((name) => ({ name,
      browser_download_url: `https://github.com/${downloadRepo}/releases/download/${tag}/${encodeURIComponent(name)}`,
      sha256: hashes.get(name),
    })),
  };
}

export function createCask(version, tag, hashes, repo = REPO, signed = false) {
  const arm = `Thinkly-${version}-arm64.dmg`;
  const intel = `Thinkly-${version}.dmg`;
  assert.ok(hashes.has(arm) && hashes.has(intel), "Both macOS DMGs are required");
  return `cask "thinkly" do
  arch arm: "-arm64", intel: ""
  version "${version},${tag.slice(`v${version}-`.length)}"
  sha256 arm: "${hashes.get(arm)}",
         intel: "${hashes.get(intel)}"
  url "https://github.com/${repo}/releases/download/v#{version.csv.first}-#{version.csv.second}/Thinkly-#{version.csv.first}#{arch}.dmg"
  name "Thinkly"
  desc "Thinkly: Keep every passing thought. Ask your past anytime."
  homepage "https://github.com/${repo}"
  depends_on :macos
  app "Thinkly.app"
  zap trash: [
    "~/Library/Application Support/Thinkly",
    "~/Library/Application Support/Goose Note",
    "~/Library/Logs/Thinkly",
    "~/Library/Logs/Goose Note",
    "~/Library/Preferences/com.thinkly.desktop.plist",
    "~/Library/Preferences/com.goosenote.desktop.plist",
    "~/Library/Saved Application State/com.thinkly.desktop.savedState",
    "~/Library/Saved Application State/com.goosenote.desktop.savedState",
  ]${signed ? "" : `
  caveats <<~EOS
    Thinkly has no Developer ID signature or Apple notarization.
    The independent author has not enrolled in Apple's paid developer program.
    Try opening the app, then allow it in System Settings → Privacy & Security.
    Homebrew installs the app only; it does not install the DMG's command helper.
    For the trusted official app, a manual fallback in Terminal is:
      sudo xattr -r -s -d com.apple.quarantine "/Applications/Thinkly.app"
    Guide: https://github.com/eachann1024/thinkly/blob/main/docs/macos-installation.md
  EOS`}
end
`;
}

export function downloadMetadata(version, tag, hashes, signed, publishedAt, releaseNotes = "") {
  const installers = releaseInstallers(version);
  const files = {
    "Casks/thinkly.rb": createCask(version, tag, hashes, REPO, signed),
    "updates/latest.json": JSON.stringify(createUpdateFeed(tag, installers, hashes, REPO, releaseNotes, publishedAt)) + "\n",
  };
  if (signed) {
    for (const arch of ["arm64", "x64"]) {
      const zip = installers.find((name) => name.endsWith(".zip") && name.includes("arm64") === (arch === "arm64"));
      files[`updates/mac-${arch}.json`] = JSON.stringify({ currentRelease: version,
        releases: [{ version, updateTo: {
          url: `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(zip)}`,
          name: version, notes: `Thinkly ${version}`, pub_date: publishedAt,
        } }],
      }) + "\n";
    }
  }
  return files;
}

export function publishedDownloadMetadata(release) {
  assert.ok(!release.draft && !release.prerelease, "Expected a published stable release");
  const version = versionFromTag(release.tag_name);
  assert.ok(version, "Unsupported release tag");
  assert.deepEqual(release.assets.map((asset) => asset.name).sort(), releaseAssets(version),
    "Published installers must include both macOS update ZIPs and match the allowlist");
  const hashes = new Map();
  for (const name of releaseInstallers(version)) {
    const asset = release.assets.find((item) => item.name === name);
    assert.match(asset?.digest ?? "", /^sha256:[a-f0-9]{64}$/, `Missing published checksum: ${name}`);
    hashes.set(name, asset.digest.slice("sha256:".length));
  }
  // This sentence is emitted only after both macOS build records report signing and notarization.
  const signed = (release.body ?? "").includes("macOS 安装包已完成代码签名与公证。");
  return downloadMetadata(version, release.tag_name, hashes, signed, release.published_at,
    publishedReleaseNotes(release.body));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = /^\d+\.\d+\.\d+$/.test(process.argv[2] ?? "") ? process.argv[2] : "1.7.317";
  const tag = `v${version}-example1`;
  const hashes = new Map(releaseInstallers(version).map((name) => [name, "a".repeat(64)]));
  const files = downloadMetadata(version, tag, hashes, false, "2026-10-18T00:00:00.000Z", "example");
  for (const [path, content] of Object.entries(files)) {
    console.log(`----- ${path} -----`);
    console.log(content);
  }
}
