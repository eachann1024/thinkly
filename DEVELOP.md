# 思绪 · Thinkly 开发说明

本地优先的 Electron Markdown 笔记应用，主窗口与独立速记小窗共享 React、TypeScript、Vite 和 BlockNote 编辑器。

## 开发与检查

使用 `package.json` 指定的 Bun 版本；Node.js 需要 20 或以上。

```bash
git clone https://github.com/eachann1024/thinkly.git
cd thinkly
bun install --frozen-lockfile
bun run dev          # 浏览器开发，端口 6001
bun run typecheck
```

`package.json` 只保留 `dev`、`linux`、`mac`、`window`、`typecheck` 五个入口。`typecheck` 用于静态排错，不是产品验收标准，也不代替界面操作。

## 构建与分发

```bash
bun run mac          # macOS 应用
bun run window       # Windows NSIS，跨平台构建要求以构建脚本为准
bun run linux        # Linux 包
```

各平台命令自动编译 renderer、Electron main/preload，准备 `dist-electron/app-pack` 后打包。CI 和 Python 构建脚本通过 `node scripts/run-task.mjs build` 调用公共编译流程；需要调试信息时设置环境变量 `GOOSE_DEBUG=1`。

GitHub 仓库是 `eachann1024/thinkly`。中文系统显示「思绪 · Thinkly」，英文系统显示 Thinkly。应用 ID 是 `com.thinkly.desktop`，磁盘上的应用是 `Thinkly.app`，数据目录是 Thinkly，安装包以 `Thinkly` / `thinkly` 命名，Homebrew cask 名是 `thinkly`，新的 WebDAV 默认目录是 `Thinkly`，SignPath 项目 slug 是 `thinkly`。已发布的 1.7.317 仍是 `Goose Note.app`，下一次发布需要手动安装一次；首次启动会把「Goose Note」数据目录改名为 Thinkly。旧笔记里的 `goose-note:` 标记仍能打开，已经保存的 WebDAV 目录不会改写。更新清单同时接受 `thinkly`、`goose-note` 和 `goose-notes` 的下载地址。不要再占用这些旧仓库名。

跨平台单入口脚本（参考 1Panel build.py 思路，三平台通用）：

```bash
python3 build.py all                               # 编译 → 打包 → 安装 → 启动
python3 build.py kill                              # 强杀运行中的 Thinkly（安装版与开发实例）
python3 build.py build --no-install                # 跳过 bun install 只编译
python3 build.py package --linux-targets AppImage,deb  # Linux 指定打包目标（缺 libarchive-tools、无法打 pacman 时）
python3 build.py install / start / status / clean / release
```

`package` 前会自动强杀旧实例（SingletonLock 与已挂载 AppImage 会阻塞覆盖）；本地打包默认注入 npmmirror 工具链镜像，已设置的 `ELECTRON_MIRROR` 等环境变量优先。`release` 读取 `artifacts/`（CI 汇总的完整产物），需 gh 已登录。

- `dist-electron/renderer`：主窗口 `index.html` 与速记 `quicknote.html`。
- `dist-electron/main`、`dist-electron/preload`：Electron 编译结果。
- `dist-electron/app-pack`：打包输入目录。
- `dist-electron/packaged`：桌面构建中间产物。
- `dist-desktop`：收集后的可分发应用与安装包。

Windows 下载包必须匹配“设置 → 系统 → 关于”中的系统类型：Intel / AMD 电脑使用 `x64-setup.exe`，ARM 电脑使用 `arm64-setup.exe`。NSIS 的 `electron/installer.nsh` 在 ARM64 包启动时检查系统架构；不匹配时在卸载旧版、解压及注册文件关联之前退出，静默安装返回 Windows 错误码 1633。此检查不影响包含多个架构的安装包。

修改后重新构建即可生成桌面安装包。macOS 通过带安装指令的 DMG 分发，并提供应用下载更新所需 ZIP；首次安装授权见 [macOS 安装说明](docs/macos-installation.md)，具体产物见 [BUILD-ARTIFACTS.md](BUILD-ARTIFACTS.md)。

## 数据与验收

当前产品以挂载本地 Markdown 文件夹为记事本；卸载挂载不删除目录。保留旧数据迁移、导出、备份与回收机制，不能把暂时无调用的迁移代码或用户笔记当作缓存清理。

普通页面、外观或局部交互，直接在浏览器中从正常入口快速操作受影响部分。复杂流程由读取 `use-browser` 的子代理通过真实界面走到最终结果，记录实际动作和可见结果。

必须使用电脑时，读取 `use-compute`，仅操作受影响的原生控件及必要系统交互；需要新安装包才运行 `bun run mac`。浏览器没有 Electron 宿主桥，不能验证真实磁盘保存、系统剪贴板或全局快捷键，未覆盖部分须如实说明。

不编写、不运行 TDD、ERE、单元或 E2E 用例，不建设测试桥、fixture 或覆盖率门槛。PR 的截图与验收要求统一见 [贡献指南](CONTRIBUTING.md)。一次性原型、截图和实操记录保存在仓库外，通过 PR 附件提供，不进入源码提交。生产构建、正式视频与安装包按实际用途归档，不当成无用缓存整目录删除。

## 性能与体积

两个固定入口，不靠主观判断：

```bash
bun run verify perf                                  # 静态预算：首屏 JS、懒加载块、sourcemap 残留
node scripts/perf/startup.mjs --app dist-desktop/Thinkly.app --runs 7
```

`verify perf` 的预算取达成值向上取整：首屏 JS（`index.html` 里的 entry + modulepreload）≤ 5600KB、modulepreload ≤ 62 条、单个首屏块 ≤ 830KB，且 echarts／mermaid／prettier／react-pdf 不得进入首屏（按块体积判定，避开几百字节的空壳 chunk）。任何提交把这些重库拖回首屏都会红。

`startup.mjs` 启动真实应用若干次，以 `process.getCreationTime()` 为零点汇总 p50/p95：`app-ready`、`did-finish-load`、`renderer-rendered`、`first-stable-frame`，以及各进程工作集内存。它复制一份真实配置目录（`--profile empty` 用空目录、`--profile real` 直接用当前配置）并通过 `GOOSE_PERF_USERDATA` 隔离，不会与正在运行的实例抢单实例锁。实测刻度：

| 阶段（p50，7 次） | 1.7.318 基线 | 现在 |
| --- | --- | --- |
| app-ready | 219ms | 181ms |
| 窗口创建 | 332ms | 286ms |
| 窗口真正显示（用户感知的"打开"） | ≈570ms（当时无此打点，dom-ready 为 521ms） | 495ms |
| 首屏脚本执行完 | 869ms | 498ms |
| 界面画出来 | 1097ms | 711ms |
| 首帧稳定 | 1139ms | 779ms |
| 工作集内存 | 725MB | 639MB |

不设 `GOOSE_PERF_LOG` 时 `electron/main/perf.ts` 全部函数立即返回，不注册监听、不开定时器、不写盘。首帧探测用的是渲染进程已有的 `data-startup-settling` 标记（bootstrap 渲染前设置、App 挂载后双 rAF 移除），不改渲染端行为。新建产物后的第一次启动额外包含系统签名校验与 Spotlight 索引，不计入常态口径。

体积已到平台下限：Electron 框架占 `.app` 的 87%（214MB），仓库侧只有 `app.asar`（29MB）可调，其中开场视频 6.8MB；多语言包、SwiftShader、DevTools 资源在上游已裁掉，`.app` 已是单 arm64 架构，没有多架构冗余。

手写实现按独立职责拆到不超过 300 行，主要模块约 200–300 行，入口、类型和纯工具可以更短。生成声明通过生成步骤分片；持久化格式、迁移、恢复、路径保护和事件顺序不能因拆分而改变。

## 项目状态

当前代码采用 MIT；第三方及历史许可例外见 THIRD-PARTY-NOTICES.txt。源码获取与构建步骤见 SOURCE-CODE.md。参阅 [LICENSE](LICENSE)、[CONTRIBUTING.md](CONTRIBUTING.md) 与 [SECURITY.md](SECURITY.md)。
