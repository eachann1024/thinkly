import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || "eachann1024/goose-notes";

export function createUpdateFeed(tag, assets, hashes, repo = REPO) {
  return {
    tag_name: tag,
    html_url: `https://github.com/${repo}/releases/tag/${tag}`,
    assets: assets.map((name) => ({
      name,
      browser_download_url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`,
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
    Goose Note is currently unsigned and not notarized.
    After installing, allow it in System Settings → Privacy & Security.
    If needed, run: xattr -cr "/Applications/Goose Note.app"
  EOS`}
end
`;
}

function gh(args, input) {
  return execFileSync("gh", args, {
    cwd: ROOT,
    encoding: "utf8",
    input,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function putFile(path, content, tag) {
  let current;
  try {
    current = JSON.parse(gh(["api", `repos/${REPO}/contents/${path}`]));
  } catch (error) {
    if (!String(error.stderr).includes("404")) throw error;
  }
  const encoded = Buffer.from(content).toString("base64");
  if (current?.content?.replace(/\s/g, "") === encoded) return;
  gh(["api", "--method", "PUT", `repos/${REPO}/contents/${path}`, "--input", "-"],
    JSON.stringify({
      message: `更新 ${tag} 下载信息`,
      content: encoded,
      ...(current?.sha ? { sha: current.sha } : {}),
    }));
}

// The only files a public Release carries: one installer per platform/arch, plus SHA256SUMS.txt.
// macOS update ZIPs are only consumed by Squirrel.Mac auto-update (updates/mac-*.json), which runs
// for signed builds only, so they are published only when both macOS builds are signed + notarized.
// Build records, notices and the source archive stay in workflow artifacts; notices are packaged in
// the app and GitHub attaches the tag's source archive to every Release.
export function releaseInstallers(version, signed) {
  return [
    `Goose.Note-${version}-arm64.dmg`,
    `Goose.Note-${version}.dmg`,
    ...(signed ? [`Goose.Note-${version}-arm64-mac.zip`, `Goose.Note-${version}-mac.zip`] : []),
    `Goose.Note-${version}-x64-setup.exe`,
    `Goose.Note-${version}-arm64-setup.exe`,
    `Goose.Note-${version}.AppImage`,
    `goose-note-app_${version}_amd64.deb`,
    `goose-note-app-${version}.pacman`,
  ];
}

export function releaseAssets(version, signed) {
  return [...releaseInstallers(version, signed), "SHA256SUMS.txt"].sort();
}

// SignPath Foundation requires a "Code signing policy" section on download/release pages.
export function codeSigningPolicy(windowsSigned) {
  return [
    "## Code signing policy",
    "",
    windowsSigned
      ? "Free code signing provided by SignPath.io, certificate by SignPath Foundation."
      : "Free code signing provided by SignPath.io, certificate by SignPath Foundation — application pending; this release is not signed yet.",
    "",
    "- Committers and reviewers: [eachann1024](https://github.com/eachann1024)",
    "- Approvers: [eachann1024](https://github.com/eachann1024)",
    `- Privacy policy: https://github.com/${REPO}/blob/main/PRIVACY.md`,
  ].join("\n");
}

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
  const tag = `v${version}-${sha.slice(0, 7)}`;
  const input = join(ROOT, "artifacts");
  const stage = mkdtempSync(join(tmpdir(), "goose-release-"));
  try {
    const signed = ["arm64", "x64"].every((arch) => {
      const build = JSON.parse(readFileSync(join(input, `goose-note-mac-${arch}-BUILD.json`), "utf8"));
      return build.signed === true && build.notarized === true;
    });
    const windowsSigned = ["arm64", "x64"].every((arch) =>
      JSON.parse(readFileSync(join(input, `goose-note-win-${arch}-BUILD.json`), "utf8")).signed === true);
    const installers = releaseInstallers(version, signed);
    const available = readdirSync(input).filter((name) => /\.(exe|dmg|zip|AppImage|deb|rpm|pacman)$/.test(name));
    const unexpected = available.filter((name) => !installers.includes(name) && !(name.endsWith(".zip") && !signed));
    assert.deepEqual(unexpected, [], `Unexpected installers would be dropped: ${unexpected.join(", ")}`);
    const hashes = new Map();
    for (const name of installers) {
      assert.ok(existsSync(join(input, name)), `Missing release installer: ${name}`);
      copyFileSync(join(input, name), join(stage, name));
      hashes.set(name, createHash("sha256").update(readFileSync(join(stage, name))).digest("hex"));
    }
    const cask = createCask(version, tag, hashes, REPO, signed);
    writeFileSync(join(stage, "SHA256SUMS.txt"), installers.map((name) => `${hashes.get(name)}  ${name}\n`).join(""));
    assert.deepEqual(readdirSync(stage).sort(), releaseAssets(version, signed));
    const baseDownloadUrl = `https://github.com/${REPO}/releases/download/${tag}`;
    const notes = [
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
      `- [SHA256SUMS.txt](${baseDownloadUrl}/SHA256SUMS.txt)：安装包 SHA-256 校验和`,
      "",
      `${signed ? "macOS 安装包已完成代码签名与公证。" : "macOS 暂未公证（如提示「无法打开」或「未知开发者」，在「系统设置 → 隐私与安全性」中点击「仍要打开」即可）；"}${windowsSigned ? "Windows 安装包已由 SignPath 签名。" : "Windows 暂未做 Authenticode 签名。"}`,
      "",
      codeSigningPolicy(windowsSigned),
    ].join("\n");
    const existing = findRelease(tag);
    if (existing && !existing.draft) {
      console.log(`${tag} is already published; keeping its assets intact.`);
      return;
    }
    if (!existing) {
      gh(["release", "create", tag, "--repo", REPO, "--target", sha,
        "--title", `Goose Note ${version}`, "--notes", notes, "--draft"]);
    }
    gh(["release", "upload", tag, "--repo", REPO, "--clobber",
      ...readdirSync(stage).map((name) => join(stage, name))]);
    const uploaded = findRelease(tag);
    assert.ok(uploaded, `Release ${tag} not found after upload`);
    assert.deepEqual(uploaded.assets.map((asset) => asset.name).sort(), releaseAssets(version, signed),
      "Release assets must match the release allowlist exactly");
    for (const [name, digest] of hashes) {
      const asset = uploaded.assets.find((item) => item.name === name);
      assert.equal(asset?.digest, `sha256:${digest}`, `Uploaded checksum mismatch: ${name}`);
    }
    gh(["release", "edit", tag, "--repo", REPO, "--draft=false", "--latest"]);
    putFile("Casks/goose-note.rb", cask, tag);
    putFile("updates/latest.json", JSON.stringify(createUpdateFeed(tag, installers, hashes)) + "\n", tag);
    if (signed) {
      for (const arch of ["arm64", "x64"]) {
        const zip = installers.find((name) => name.endsWith(".zip") && name.includes("arm64") === (arch === "arm64"));
        assert.ok(zip, `Missing ${arch} update ZIP`);
        putFile(`updates/mac-${arch}.json`, JSON.stringify({
          currentRelease: version,
          releases: [{ version, updateTo: {
            url: `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(zip)}`,
            name: version, notes: `Goose Note ${version}`, pub_date: new Date().toISOString(),
          } }],
        }) + "\n", tag);
      }
    }
    console.log(`Published and verified ${tag} in ${REPO}.`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
