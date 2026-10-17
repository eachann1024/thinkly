# 自动构建与下载

**Desktop installers** 按工作流配置定时检查 `main`，或由维护者手动触发，生成 Windows x64/arm64、macOS arm64/x64、Linux x64 安装包和对应源码归档。所有任务共用固定提交；提交 PR 不会触发界面截图或预览报告。

每天北京时间 08:00（UTC 00:00）会检查 `main`，有新提交时构建并发布；也可在 Actions 中手动运行 **Desktop installers**。只有 `main` 的定时或手动运行在全部平台和源码归档成功后，才将安装包及校验值发布到 [goose-note Releases](https://github.com/eachann1024/goose-note/releases/latest)，并维护 Homebrew Cask 和更新信息。推送和 PR 运行只生成 Actions 附件，不使用签名凭证或发布权限。已发布的同一提交保持原附件；只改变更新信息或 Cask 的提交不会触发下一次定时重建。不向 AUR 发布。

发布的安装包可在 https://github.com/eachann1024/goose-note/releases 的 **Assets** 下载。每次提交的安装包位于 https://github.com/eachann1024/goose-note/actions/workflows/desktop-build.yml ：打开对应提交的成功运行，在 **Artifacts** 下载 `goose-note-<平台>-<架构>-<完整 SHA>`；源码附件为 `source-<完整 SHA>`。Actions 附件下载需要登录 GitHub；产物保留 30 天，Release 附件不使用此到期策略；过期后可从固定提交重新构建。下载的 Actions ZIP 是外层归档，请先解压；macOS 包内的应用 `.zip` 解压后是 `Goose Note.app`。

Release 附件只包含下列安装包和一份 `SHA256SUMS.txt`（全部安装包的 SHA-256，便于下载后校验）：

| 系统 | CPU | Release 附件 | 说明与推荐 |
| --- | --- | --- | --- |
| macOS | Apple Silicon arm64 | `Goose.Note-<版本>-arm64.dmg` | **M1 / M2 / M3 / M4 芯片（推荐，绝大多数 Mac）** |
| macOS | Intel x64 | `Goose.Note-<版本>.dmg` | Intel 芯片老款 Mac（无 arm64 标识） |
| Windows | x64 | `Goose.Note-<版本>-x64-setup.exe`（NSIS） | **Intel / AMD 64 位（推荐，绝大多数 Windows 电脑）** |
| Windows | ARM64 | `Goose.Note-<版本>-arm64-setup.exe`（NSIS，在 x64 runner 交叉打包；应用不含原生模块） | 骁龙等 ARM 架构 Windows 设备 |
| Linux | x64 通用 | `Goose.Note-<版本>.AppImage` | 免安装通用版 |
| Debian / Ubuntu | x64 | `goose-note-app_<版本>_amd64.deb` | Debian / Ubuntu 安装包 |
| Arch Linux / Omarchy 等 Arch 系 | x86_64 | `goose-note-app-<版本>.pacman` | Arch 系安装包 |

macOS 应用 `.zip` 同时随 Actions 和 Release 分发，用于应用下载更新；仅在两个 macOS 包均完成 Developer ID 签名与公证时生成 Squirrel.Mac 更新源（`updates/mac-*.json`）。ZIP 不包含 DMG 安装指令。不再构建 rpm。BUILD.json、源码归档、LICENSE 等构建记录只保留在 Actions 附件；许可与第三方声明随安装包附带，对应源码见 Release 页 GitHub 自动附带的 Source code 归档。发布脚本按固定清单核对 Release 附件，多一个或少一个都会失败。

Arch 指 Linux 发行版，Omarchy（Arch + Hyprland）同样使用 `.pacman` 包：执行 `sudo pacman -U ./goose-note-app-*.pacman`，包管理器解析并安装依赖（gtk3、nss、alsa-lib 等）。CI 在 Arch 官方容器中实际安装包、检查安装记录、应用资源和 `ldd` 无缺失库。此检查不代替图形桌面启动和功能验收。AppImage 可作为另一种 Linux 分发方式，部分系统需安装 FUSE。

未配置 Apple 证书时，macOS 构建使用免费 ad-hoc 签名，未进行 Developer ID 签名与公证，首次安装需要额外授权（见 [macOS 安装说明](docs/macos-installation.md)）；签名支持不代表某次构建已获批或已启用。只对确认来源的构建按操作系统提示操作。应用版本来自 package.json；提交 SHA 和运行 ID 用于区分同版本不同构建，不应当作新的稳定发布版本。

每个平台的 Actions 附件包含安装包、`BUILD.json` 和 `SHA256SUMS.txt`。同一运行的 `source-<SHA>` 包含 `git archive` 生成的准确项目源码、锁文件、构建脚本及声明，不包含未提交的本地工作。项目源码归档不等同于已完成全部依赖的对应源码交付；公开分发前仍须按 SOURCE-CODE.md 补齐必要的依赖源码、核对第三方声明和字体来源。

## 复现

使用对应操作系统、Node.js 22、Bun 1.3.14。Linux 安装 `libarchive-tools`（pacman 包）；macOS 安装 Xcode Command Line Tools。

```sh
bun install --frozen-lockfile
node scripts/run-task.mjs build
node scripts/build-ci-installers.mjs mac arm64
# 其他组合：mac x64、win x64、win arm64、linux x64
```

安装包和校验清单位于 `dist-desktop/ci/`。CI 使用冻结锁文件，不依赖本机未提交修改。macOS arm64 还执行 `bun run mac` 验证原生应用构建和安装；打包检查包括所需格式是否齐全、Arch 包可安装。不表示所有桌面交互已经验收。类型检查需单独执行。

在 macOS 27 本地已构建应用时，也可用 `python3 scripts/build-local-dmg.py --output ~/Downloads/Goose-Note-local.dmg` 直接生成 DMG 和 SHA-256 文件。脚本复用 electron-builder 缓存的 Python 依赖，通过 `diskutil` 打包；卷名限制为短 ASCII，避免背景图片的旧式别名记录截断，并在最终 DMG 中用 macOS 原生接口解析背景路径、校验应用签名。此检查不等同于 Finder 界面验收。

## Windows SignPath 维护

仅 Windows 发布运行（`PUBLISH=true`）且已配置 secret `SIGNPATH_API_TOKEN` 和 variable `SIGNPATH_ORGANIZATION_ID` 时启用签名；推送与 PR 构建不签名。缺少配置时沿用未签名路径，实际决策见 `scripts/signpath-config.mjs`。

默认项目 slug 为 `goose-notes`，策略为 `release-signing`，主程序与安装包配置分别为 `app-exe`、`installer`。可分别通过 `SIGNPATH_PROJECT_SLUG`、`SIGNPATH_SIGNING_POLICY_SLUG`、`SIGNPATH_APP_ARTIFACT_CONFIGURATION_SLUG` 和 `SIGNPATH_INSTALLER_ARTIFACT_CONFIGURATION_SLUG` 覆盖；历史项目 slug 不随仓库更名修改。

工作流先签 `Goose Note.exe`，再打 NSIS 安装包并签 installer；两个架构各提交两次请求。每次请求均需维护者在 SignPath 人工批准，任务最多等待 60 分钟。SignPath 账号、可信 GitHub 构建系统、签名策略和 artifact configuration 需按实际上传的 ZIP 内容配置；文档中的支持流程不代表服务审批或正式签名已完成。

## macOS 安装引导链路

Actions 的两个 macOS 架构均通过 `prepare-electron-pack.mjs` 复制 DMG 资源，展示背景与安装指令（帮助文件不再放入 DMG），随后由 `build-ci-installers.mjs` 打包，并在 BUILD.json 写入 `macInstallHelper: 1`。Release 只有在两个架构均声明此能力时才介绍安装指令；下载页读取 Release 中的能力标记，旧版未标记的包仍使用手动授权说明。Release 与下载页共用 `scripts/macos-install-copy.mjs` 文案。Homebrew 只安装应用，单独给出手动授权路径。
