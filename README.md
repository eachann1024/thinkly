<p align="center">
  <img src="public/logo.png" width="64" height="64" alt="Goose Note 图标" />
</p>

<h1 align="center">Goose Note</h1>

<p align="center">鹅的笔记 · 给思绪一个安静的地方</p>

<p align="center">
  本地 Markdown、随手速记与 AI，放在同一个写作空间。
</p>

<p align="center">
  <a href="#下载安装">下载安装</a> ·
  <a href="#开始记录">开始记录</a> ·
  <a href="DEVELOP.md">开发文档</a> ·
  <a href="CONTRIBUTING.md">贡献与 PR 指南</a> ·
  <a href="SECURITY.md">安全说明</a>
</p>

<br />

## 演示视频

https://github.com/user-attachments/assets/95f9bf50-3992-4f99-a256-b52ee6f41b74

<p align="center"><sub>产品展示以视频为准。</sub></p>

<br />

## 从自己的文件夹开始

打开一个本地 Markdown 文件夹，就能继续写作。项目资料、阅读摘录与日常记录，都留在自己的文件里。

灵感来得突然时，用独立速记小窗先记下来，再收进笔记。需要梳理思路时，让 AI 引用已有内容、提炼重点，或修改指定段落；原文与对话始终可以并排对照。

<br />

## 让复杂的内容，也容易读

文字、代码、公式和 Mermaid 图示写在一起。用清单推进下一步，用表格整理信息，再将笔记导出为 Markdown、HTML、PDF、Word 或图片。

<br />

## 留下内容，也保留余地

- **文件在本地。** 直接使用 Markdown 目录，解除挂载不会删除磁盘文件。
- **重要内容有迹可循。** 页面锁定与历史版本，保留值得回看的节点。
- **按需使用 AI。** 使用在线服务时，请求及引用的笔记内容会发送至所配置的服务。

<br />

## 下载安装

前往 [GitHub Releases](https://github.com/eachann1024/goose-notes/releases/latest) 下载最新版本安装包：

| 系统平台 | 安装包名称 | 架构说明与推荐 |
| :--- | :--- | :--- |
| **macOS** | `Goose.Note-*-arm64.dmg` | **Apple Silicon（M1 / M2 / M3 / M4 芯片，绝大多数 Mac 选此项）** |
| | `Goose.Note-*.dmg` | Intel 芯片老款 Mac（文件名无 arm64 标识） |
| **Windows** | `Goose.Note-*-x64-setup.exe` | **64 位 PC（Intel / AMD，绝大多数 Windows 电脑选此项）** |
| | `Goose.Note-*-arm64-setup.exe` | 骁龙 / ARM 架构 Windows 设备 |
| **Linux** | `Goose.Note-*.AppImage` | 免安装通用版（双击运行，部分发行版需 FUSE） |
| | `goose-note-app_*_amd64.deb` | Debian / Ubuntu 等系统 |
| | `goose-note-app-*.pacman` | Arch Linux / Omarchy 等 Arch 系 |

> **提示**：安装包暂未公证/签名。macOS 首次打开如遇「无法打开」或「未知开发者」提示，在「系统设置 → 隐私与安全性」中点击「仍要打开」；Windows 如遇 SmartScreen 提示，点击「更多信息 → 仍要运行」。

<details>
<summary>macOS 亦可通过 Homebrew 安装</summary>

```bash
brew tap eachann1024/goose-notes https://github.com/eachann1024/goose-notes
brew install --cask eachann1024/goose-notes/goose-note
# 升级
brew upgrade --cask goose-note
```

</details>

<br />

## 开始记录

1. 启动 Goose Note，选择「打开本地文件夹」。
2. 打开已有 Markdown 文件，或新建一页，写下第一个想法。
3. 需要整理时打开 AI 面板；需要分享时，从页面菜单导出。

<details>
<summary>从源码运行与平台说明</summary>

采用 Electron、React、TypeScript 和 BlockNote。仓库提供 macOS、Windows 和 Linux 的开发与构建命令；安装包可用性以实际提供的构建为准。

```bash
bun install --frozen-lockfile
bun run mac
```

完整运行、验证与打包步骤见 [开发文档](DEVELOP.md)。

</details>


---

**同系列**　[鹅的书签](https://github.com/eachann1024/goose-mark) · [鹅的监控](https://github.com/eachann1024/goose-monitor) · [鹅的验证](https://github.com/eachann1024/goose-2fa) · [鹅的 Agent](https://github.com/eachann1024/eachann1024)

<details>
<summary>许可与第三方声明 · MIT</summary>

当前源码以 **MIT** 许可提供，允许商用、修改和再分发；请保留版权与许可声明。详见 [LICENSE](LICENSE)。

AI 菜单与 PDF 导出使用项目独立实现，已移除 BlockNote XL AI/PDF 包。BlockNote core/react/mantine 保留 MPL-2.0，其他第三方部分沿用各自许可，详见 [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)。原有 MIT 来源与贡献者署名均保留。

</details>
