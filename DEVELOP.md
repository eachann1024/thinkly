# Goose Note 开发说明

本地优先的 Electron Markdown 笔记应用，主窗口与独立速记小窗共享 React、TypeScript、Vite 和 BlockNote 编辑器。

## 开发与检查

使用 `package.json` 指定的 Bun 版本；Node.js 需要 20 或以上。

```bash
git clone https://github.com/eachann1024/goose-note.git
cd goose-note
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

仓库与源码目录统一为 `goose-note`，应用展示名为 `Goose Note`（鹅的笔记）。为兼容已安装版本，保留应用 ID `com.goosenote.desktop`、应用数据目录、Linux 包名及可执行文件名 `goose-note-app`、已保存的 WebDAV 目录和 SignPath 项目 slug。更新清单中的安装包继续使用旧仓库下载别名，由 GitHub 重定向；客户端同时校验新旧仓库地址。请勿复用旧仓库名，以免中断旧版更新。

跨平台单入口脚本（参考 1Panel build.py 思路，三平台通用）：

```bash
python3 build.py all                               # 编译 → 打包 → 安装 → 启动
python3 build.py kill                              # 强杀运行中的 Goose Note（安装版与开发实例）
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

修改后重新构建即可生成桌面安装包。macOS 通过 DMG 分发；已签名并公证的构建另提供应用内更新所需 ZIP，具体产物见 [BUILD-ARTIFACTS.md](BUILD-ARTIFACTS.md)。

## 数据与验收

当前产品以挂载本地 Markdown 文件夹为记事本；卸载挂载不删除目录。保留旧数据迁移、导出、备份与回收机制，不能把暂时无调用的迁移代码或用户笔记当作缓存清理。

普通页面、外观或局部交互，直接在浏览器中从正常入口快速操作受影响部分。复杂流程由读取 `use-browser` 的子代理通过真实界面走到最终结果，记录实际动作和可见结果。

必须使用电脑时，读取 `use-compute`，仅操作受影响的原生控件及必要系统交互；需要新安装包才运行 `bun run mac`。浏览器没有 Electron 宿主桥，不能验证真实磁盘保存、系统剪贴板或全局快捷键，未覆盖部分须如实说明。

不编写、不运行 TDD、ERE、单元或 E2E 用例，不建设测试桥、fixture 或覆盖率门槛。PR 的截图与验收要求统一见 [贡献指南](CONTRIBUTING.md)。一次性原型、截图和实操记录保存在仓库外，通过 PR 附件提供，不进入源码提交。生产构建、正式视频与安装包按实际用途归档，不当成无用缓存整目录删除。

手写实现按独立职责拆到不超过 300 行，主要模块约 200–300 行，入口、类型和纯工具可以更短。生成声明通过生成步骤分片；持久化格式、迁移、恢复、路径保护和事件顺序不能因拆分而改变。

## 项目状态

当前代码采用 MIT；第三方及历史许可例外见 THIRD-PARTY-NOTICES.txt。源码获取与构建步骤见 SOURCE-CODE.md。参阅 [LICENSE](LICENSE)、[CONTRIBUTING.md](CONTRIBUTING.md) 与 [SECURITY.md](SECURITY.md)。
