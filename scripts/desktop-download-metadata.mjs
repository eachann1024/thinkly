import assert from "node:assert/strict";
import { REPO, versionFromTag } from "./desktop-release-support.mjs";
import { publishedReleaseNotes } from "./desktop-release-notes.mjs";

export function releaseInstallers(version) {
  return [
    `Goose.Note-${version}-arm64.dmg`, `Goose.Note-${version}.dmg`,
    `Goose.Note-${version}-arm64-mac.zip`, `Goose.Note-${version}-mac.zip`,
    `Goose.Note-${version}-x64-setup.exe`, `Goose.Note-${version}-arm64-setup.exe`,
    `Goose.Note-${version}.AppImage`, `goose-note-app_${version}_amd64.deb`,
    `goose-note-app-${version}.pacman`,
  ];
}

export function releaseAssets(version) {
  return [...releaseInstallers(version), "SHA256SUMS.txt"].sort();
}

export function createUpdateFeed(tag, assets, hashes, repo = REPO, releaseNotes = "", publishedAt = "") {
  // Published clients require the legacy prefix; GitHub redirects it to the renamed repository.
  const downloadRepo = repo === "eachann1024/goose-note" ? "eachann1024/goose-notes" : repo;
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
  const arm = `Goose.Note-${version}-arm64.dmg`;
  const intel = `Goose.Note-${version}.dmg`;
  assert.ok(hashes.has(arm) && hashes.has(intel), "Both macOS DMGs are required");
  return `cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "${version},${tag.slice(`v${version}-`.length)}"
  sha256 arm: "${hashes.get(arm)}",
         intel: "${hashes.get(intel)}"
  url "https://github.com/${repo}/releases/download/v#{version.csv.first}-#{version.csv.second}/Goose.Note-#{version.csv.first}#{arch}.dmg"
  name "Goose Note"
  desc "Local-first Markdown notes with AI"
  homepage "https://github.com/${repo}"
  depends_on :macos
  app "Goose Note.app"
  zap trash: [
    "~/Library/Application Support/Goose Note",
    "~/Library/Logs/Goose Note",
    "~/Library/Preferences/com.goosenote.desktop.plist",
    "~/Library/Saved Application State/com.goosenote.desktop.savedState",
  ]${signed ? "" : `
  caveats <<~EOS
    Goose Note has no Developer ID signature or Apple notarization.
    The independent author has not enrolled in Apple's paid developer program.
    Try opening the app, then allow it in System Settings → Privacy & Security.
    Homebrew installs the app only; it does not install the DMG's command helper.
    For the trusted official app, a manual fallback in Terminal is:
      sudo xattr -r -s -d com.apple.quarantine "/Applications/Goose Note.app"
    Guide: https://github.com/eachann1024/goose-note/blob/main/docs/macos-installation.md
  EOS`}
end
`;
}

export function downloadMetadata(version, tag, hashes, signed, publishedAt, releaseNotes = "") {
  const installers = releaseInstallers(version);
  const files = {
    "Casks/goose-note.rb": createCask(version, tag, hashes, REPO, signed),
    "updates/latest.json": JSON.stringify(createUpdateFeed(tag, installers, hashes, REPO, releaseNotes, publishedAt)) + "\n",
  };
  if (signed) {
    for (const arch of ["arm64", "x64"]) {
      const zip = installers.find((name) => name.endsWith(".zip") && name.includes("arm64") === (arch === "arm64"));
      files[`updates/mac-${arch}.json`] = JSON.stringify({ currentRelease: version,
        releases: [{ version, updateTo: {
          url: `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(zip)}`,
          name: version, notes: `Goose Note ${version}`, pub_date: publishedAt,
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
