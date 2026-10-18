#!/usr/bin/env node
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "dist-electron/app-pack");
let pkg;
try {
  pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
} catch (err) {
  throw new Error(`Failed to parse root package.json: ${err.message}`);
}

// Use the exact installed version, including lockfile resolutions, for release packaging.
const electronVersion = JSON.parse(
  readFileSync(resolve(root, "node_modules/electron/package.json"), "utf8"),
).version;

// Linux 包要求邮箱格式；默认使用非联系地址占位，不向公开作者字段补入私人邮箱。
const linuxMaintainer =
  process.env.LINUX_MAINTAINER ||
  (typeof pkg.author === "string" && pkg.author.includes("@") ? pkg.author : undefined) ||
  (pkg.author?.email
    ? `${pkg.author.name} <${pkg.author.email}>`.trim()
    : undefined) ||
  "Thinkly <thinkly@users.noreply.github.com>";

rmSync(pack, { recursive: true, force: true });
mkdirSync(pack, { recursive: true });
for (const dir of ["main", "preload", "renderer"]) {
  cpSync(resolve(root, "dist-electron", dir), resolve(pack, dir), {
    recursive: true,
  });
}
cpSync(resolve(root, "electron/icons/icon.icns"), resolve(pack, "icon.icns"));
cpSync(resolve(root, "electron/icons/icon.ico"), resolve(pack, "icon.ico"));
cpSync(resolve(root, "electron/icons/icon.png"), resolve(pack, "icon.png"));
cpSync(resolve(root, "electron/installer.nsh"), resolve(pack, "installer.nsh"));
cpSync(resolve(root, "scripts/mac-adhoc-sign.cjs"), resolve(pack, "mac-adhoc-sign.cjs"));
cpSync(resolve(root, "scripts/set-file-icon.swift"), resolve(pack, "set-file-icon.swift"));
cpSync(resolve(root, "electron/macos-l10n"), resolve(pack, "macos-l10n"), { recursive: true });
cpSync(resolve(root, "electron/installer"), resolve(pack, "dmg-assets"), { recursive: true });
mkdirSync(resolve(pack, "node_modules"), { recursive: true });

function stripPackJunk(dir) {
  if (process.env.GOOSE_DEBUG === "1") return;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const info = statSync(full);
      if (info.isDirectory()) {
        if (name === "test" || name === "tests" || name === "__tests__") {
          rmSync(full, { recursive: true, force: true });
        } else {
          stack.push(full);
        }
      } else if (
        name.endsWith(".map") ||
        name.endsWith(".md") ||
        name.endsWith(".d.ts")
      ) {
        unlinkSync(full);
      }
    }
  }
}

stripPackJunk(pack);

// Legal notices and source instructions must survive release-file filtering.
for (const file of ["LICENSE", "THIRD-PARTY-NOTICES.txt"]) {
  cpSync(resolve(root, file), resolve(pack, file));
}
cpSync(resolve(root, "SOURCE-CODE.md"), resolve(pack, "SOURCE-CODE.txt"));

writeFileSync(
  resolve(pack, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      repository: pkg.repository,
      homepage: pkg.homepage || "https://github.com/eachann1024/thinkly",
      bugs: pkg.bugs,
      license: pkg.license,
      private: true,
      type: "module",
      main: "main/index.js",
      productName: "Thinkly",
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  resolve(pack, "electron-builder.yml"),
  `appId: com.thinkly.desktop
# productName 决定 .app、可执行文件和安装目录。显示名走 InfoPlist / setName / 快捷方式名。
productName: Thinkly
copyright: Copyright © 2026 eachann1024
directories:
  output: ../packaged
asar: true
afterPack: ./mac-adhoc-sign.cjs
npmRebuild: false
electronVersion: ${electronVersion}
compression: maximum
# mac 上 Chromium 语言包是 zh_CN.lproj（下划线）。必须带 zh_CN，否则 zh-CN 匹配不到。
electronLanguages:
  - zh_CN
  - zh-CN
  - zh-Hans
  - en
  - en-US
files:
  - "!**/*.map"
  - "!**/*.md"
  - "!**/*.d.ts"
  - "!**/test/**"
  - "!**/tests/**"
  - "!**/__tests__/**"
  - "!icon.icns"
  - "!icon.ico"
  # BrowserWindow 在 Linux/Windows 从 app.asar/icon.png 读取窗口图标，必须保留。
  - "!electron-builder.yml"
  - "!installer.nsh"
  - "!dmg-assets/**"
  - "!mac-adhoc-sign.cjs"
  - "!set-file-icon.swift"
fileAssociations:
  - ext: md
    name: Markdown
    description: Markdown 文档
    mimeType: text/markdown
    role: Editor
    icon: icon.icns
  - ext: markdown
    name: Markdown
    description: Markdown 文档
    mimeType: text/markdown
    role: Editor
    icon: icon.icns
mac:
  icon: icon.icns
  category: public.app-category.productivity
  ${process.env.CSC_LINK ? '# CI Developer ID signing via CSC_LINK' : 'identity: null # afterPack applies a free ad-hoc signature'}
  hardenedRuntime: ${Boolean(process.env.CSC_LINK)}
  gatekeeperAssess: false
  extendInfo:
    LSHasLocalizedDisplayName: true
    LSMultipleInstancesProhibited: true
    CFBundleDisplayName: Thinkly
    # 不要写 CFBundleName。Electron 用它找 Helper.app，必须等于 productName（磁盘上的 Thinkly）。
    # 用户看到的名字是 CFBundleDisplayName、macos-l10n 和 app.setName，已经是思绪 · Thinkly。
    NSAppleEventsUsageDescription: Thinkly needs to send system events so keyboard shortcuts can open the main window and the quick note.
    NSAccessibilityUsageDescription: Thinkly needs Accessibility permission so keyboard shortcuts can open the main window and the quick note while another app is in front.
  target:
    - target: dir
      arch:
        - arm64
        - x64
  # 只改压缩包文件名。.app 仍由 productName 决定。x64 的 CI 会去掉 -\${arch}，避免 -x64.dmg。
  artifactName: Thinkly-\${version}-\${arch}-mac.\${ext}
dmg:
  artifactName: Thinkly-\${version}-\${arch}.\${ext}
  title: Thinkly
  background: dmg-assets/background.tiff
  window:
    width: 960
    height: 640
  iconSize: 88
  iconTextSize: 16
  contents:
    - x: 240
      y: 270
      type: file
    - x: 720
      y: 270
      type: link
      path: /Applications
    - x: 480
      y: 520
      type: file
      path: dmg-assets/安装指令.command
win:
  icon: icon.ico
  # true：把 icon/版本信息写入 exe；CI 已关 CSC_IDENTITY_AUTO_DISCOVERY，不会真签名
  signAndEditExecutable: true
  target:
    - target: nsis
      arch:
        - x64
nsis:
  include: installer.nsh
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: icon.ico
  uninstallerIcon: icon.ico
  installerHeaderIcon: icon.ico
  # 安装包文件名用 productName（Thinkly）。
  shortcutName: Thinkly
  uninstallDisplayName: Thinkly
  artifactName: Thinkly-\${version}-\${arch}-setup.\${ext}
linux:
  icon: icon.png
  executableName: thinkly
  category: Utility
  vendor: ${pkg.author?.name || "Thinkly"}
  synopsis: ${JSON.stringify(pkg.description || "Local-first note taking app")}
  maintainer: ${JSON.stringify(linuxMaintainer)}
  target:
    - AppImage
    - deb
    - pacman
  desktop:
    entry:
      Name: Thinkly
      "Name[zh_CN]": "思绪 · Thinkly"
      Comment: "Thinkly: Keep every passing thought. Ask your past anytime."
      "Comment[zh_CN]": "思绪 Thinkly：安放每一瞬念头，随时向过去提问"
      Categories: Office;Note;
      MimeType: text/markdown;text/x-markdown;
      StartupWMClass: thinkly
appImage:
  artifactName: Thinkly-\${version}.\${ext}
deb:
  packageName: thinkly
  artifactName: Thinkly_\${version}_\${arch}.\${ext}
pacman:
  packageName: thinkly
  artifactName: Thinkly-\${version}.\${ext}
  depends:
    - gtk3
    - nss
    - alsa-lib
    - libxss
    - libxtst
    - libnotify
    - libsecret
    - xdg-utils
    - libappindicator-gtk3
`,
);
