import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REPO, versionFromTag } from "./desktop-release-support.mjs";
import { publishedReleaseNotes } from "./desktop-release-notes.mjs";
import { publicInstallers, publishedPayloads, releaseAssets } from "./desktop-update-files.mjs";

export { publishedPayloads, releaseAssets };
export function releaseInstallers(version) {
  return publicInstallers(version);
}

export function createUpdateFeed(tag, assets, hashes, repo = REPO, releaseNotes = "", publishedAt = "") {
  const downloadRepo = repo;
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
  assert.ok(hashes.has(arm), "Apple silicon macOS DMG is required");
  return `cask "thinkly" do
  version "${version},${tag.slice(`v${version}-`.length)}"
  sha256 "${hashes.get(arm)}"
  url "https://github.com/${repo}/releases/download/v#{version.csv.first}-#{version.csv.second}/Thinkly-#{version.csv.first}-arm64.dmg"
  name "Thinkly"
  desc "Thinkly: Keep every passing thought. Ask your past anytime."
  homepage "https://github.com/${repo}"
  depends_on arch: :arm64
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
  const feed = publishedPayloads(version);
  const files = {
    "Casks/thinkly.rb": createCask(version, tag, hashes, REPO, signed),
    "updates/latest.json": JSON.stringify(createUpdateFeed(tag, feed, hashes, REPO, releaseNotes, publishedAt)) + "\n",
  };
  if (signed) {
    const zip = `Thinkly-${version}-arm64-mac.zip`;
    assert.ok(feed.includes(zip), "Apple silicon macOS update ZIP is required");
    files["updates/mac-arm64.json"] = JSON.stringify({ currentRelease: version,
      releases: [{ version, updateTo: {
        url: `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(zip)}`,
        name: version, notes: `Thinkly ${version}`, pub_date: publishedAt,
      } }],
    }) + "\n";
  }
  return files;
}

export function publishedDownloadMetadata(release) {
  assert.ok(!release.draft && !release.prerelease, "Expected a published stable release");
  const version = versionFromTag(release.tag_name);
  assert.ok(version, "Unsupported release tag");
  assert.deepEqual(release.assets.map((asset) => asset.name).sort(), releaseAssets(version),
    "Published installers must include the Apple silicon update ZIP and match the allowlist");
  const hashes = new Map();
  for (const name of publishedPayloads(version)) {
    const asset = release.assets.find((item) => item.name === name);
    assert.match(asset?.digest ?? "", /^sha256:[a-f0-9]{64}$/, `Missing published checksum: ${name}`);
    hashes.set(name, asset.digest.slice("sha256:".length));
  }
  const signed = (release.body ?? "").includes("macOS 安装包已完成代码签名与公证。");
  return downloadMetadata(version, release.tag_name, hashes, signed, release.published_at,
    publishedReleaseNotes(release.body));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = /^\d+\.\d+\.\d+$/.test(process.argv[2] ?? "") ? process.argv[2] : "1.7.317";
  const tag = `v${version}-example1`;
  const hashes = new Map(publishedPayloads(version).map((name) => [name, "a".repeat(64)]));
  const files = downloadMetadata(version, tag, hashes, false, "2026-10-18T00:00:00.000Z", "example");
  for (const [path, content] of Object.entries(files)) {
    console.log(`----- ${path} -----`);
    console.log(content);
  }
}
