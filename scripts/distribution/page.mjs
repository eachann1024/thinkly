const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function downloadPage(version, feed, release) {
  const asset = (name, label) => {
    const item = feed.assets.find((entry) => entry.name === name);
    if (!item) throw new Error(`Download page is missing ${name}`);
    return `<a class="download" href="${escape(item.browser_download_url)}">${escape(label)}<span aria-hidden="true">↓</span></a>`;
  };
  const lines = (feed.releaseNotes || "").trim().split(/\r?\n/).filter(Boolean);
  const notes = lines.map((line) => {
    if (/^#{1,6}\s/.test(line)) return `<h3>${escape(line.replace(/^#{1,6}\s+/, ""))}</h3>`;
    const bullet = /^[-*•]\s*/.test(line);
    return `<p${bullet ? ' class="change"' : ""}>${escape(line.replace(/^[-*•]\s*/, ""))}</p>`;
  }).join("\n");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="description" content="下载鹅的笔记，查看最新版本与更新日志。">
<title>鹅的笔记 · 下载</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:#292822;background:#f6f5f1;color-scheme:light dark}
*{box-sizing:border-box}body{margin:0}main{max-width:900px;margin:auto;padding:64px 28px}header{margin-bottom:40px}
.brand{display:flex;align-items:center;gap:12px;font-size:20px;font-weight:650}.goose{font-size:30px}h1{font-size:40px;letter-spacing:-1.5px;margin:28px 0 12px}
.version{color:#68675f;font-size:15px}.platforms{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}section{border:1px solid #deddd5;border-radius:16px;padding:22px;background:#fffefa}
h2{font-size:18px;margin:0 0 20px}.download{display:flex;align-items:center;justify-content:space-between;gap:12px;color:inherit;text-decoration:none;border:1px solid #deddd5;border-radius:9px;padding:12px;margin-top:10px;font-size:14px}
.download:hover,.download:focus-visible{border-color:#78764f;background:#f1f0e6;outline:2px solid transparent}.download span{color:#737044}.changelog{margin-top:32px;padding:28px}h3{font-size:16px;margin:24px 0 12px}p{line-height:1.8;margin:10px 0;font-size:15px;overflow-wrap:anywhere}.change{padding-left:16px;position:relative}.change:before{content:"·";position:absolute;left:0}
footer{margin-top:24px;display:flex;gap:20px;flex-wrap:wrap}footer a{color:#68675f;font-size:14px;text-underline-offset:4px}
@media(max-width:680px){main{padding:32px 20px}.platforms{grid-template-columns:1fr}h1{font-size:32px}.changelog{padding:22px}}
@media(prefers-color-scheme:dark){:root{color:#edede5;background:#1c1d1a}section{background:#252620;border-color:#414239}.version,footer a{color:#b3b3a4}.download{border-color:#48493f}.download:hover,.download:focus-visible{background:#33352b;border-color:#a8a574}.download span{color:#c9c589}}
</style></head><body><main>
<header><div class="brand"><span class="goose" aria-hidden="true">🪿</span>鹅的笔记</div><h1>让想法，有处安放。</h1><div class="version">版本 ${escape(version)}</div></header>
<div class="platforms">
<section aria-labelledby="mac"><h2 id="mac">macOS</h2>
${asset(`Goose.Note-${version}-arm64.dmg`, "Apple Silicon")}
${asset(`Goose.Note-${version}.dmg`, "Intel")}</section>
<section aria-labelledby="win"><h2 id="win">Windows</h2>
${asset(`Goose.Note-${version}-x64-setup.exe`, "Intel / AMD")}
${asset(`Goose.Note-${version}-arm64-setup.exe`, "ARM64")}</section>
<section aria-labelledby="linux"><h2 id="linux">Linux</h2>
${asset(`Goose.Note-${version}.AppImage`, "AppImage")}
${asset(`goose-note-app_${version}_amd64.deb`, "Debian / Ubuntu")}
${asset(`goose-note-app-${version}.pacman`, "Arch Linux")}</section>
</div>
<section class="changelog" aria-labelledby="changes"><h2 id="changes">更新日志</h2>${notes || "<p>暂无更新日志。</p>"}</section>
<section class="changelog" aria-labelledby="signing"><h2 id="signing">Code signing policy</h2>
<p>${release.body?.includes("macOS 安装包已完成代码签名与公证。") ? "macOS 安装包已签名并公证。" : "macOS 安装包暂未公证。"} ${release.body?.includes("Windows 安装包已由 SignPath 签名。") ? "Windows 安装包已由 SignPath 签名。" : "Windows 安装包暂未签名。"}</p>
<p>Free code signing provided by <a href="https://signpath.io">SignPath.io</a>, certificate by <a href="https://signpath.org">SignPath Foundation</a>${release.body?.includes("Windows 安装包已由 SignPath 签名。") ? "." : " — application pending; this release is not signed yet."}</p>
<p>Committers, reviewers and approvers: <a href="https://github.com/eachann1024">eachann1024</a></p></section>
<footer><a href="${escape(release.html_url)}">GitHub Release</a><a href="${escape(feed.assets[0].browser_download_url.replace(/[^/]+$/, "SHA256SUMS.txt"))}">SHA-256 校验文件</a><a href="https://github.com/eachann1024/goose-note/blob/main/PRIVACY.md">隐私政策</a></footer>
</main></body></html>\n`;
}
