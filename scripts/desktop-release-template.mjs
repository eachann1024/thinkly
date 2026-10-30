const RELEASE_REPO = "eachann1024/thinkly";

export function releaseDownloadTemplate({ version, date, repo = RELEASE_REPO }) {
  return [
    `## Thinkly ${version}`,
    "",
    date,
    "",
    "### 下载",
    "",
    "每个平台一个安装包，对号入座：",
    "",
    `- **Mac（Apple 芯片）** — Thinkly-${version}-arm64.dmg`,
    `- **Windows 64 位** — Thinkly-${version}-x64-setup.exe（ARM 电脑也能直接用）`,
    `- **Linux** — Thinkly-${version}.AppImage`,
    "",
    `Intel Mac、Linux deb / pacman 包不提供。需要请到 [GitHub](https://github.com/${repo}) 拉取源码自行编译。`,
    "",
    "zip、blockmap、yml 仅供应用内自动更新，无需下载。",
  ].join("\n");
}
