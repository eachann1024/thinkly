# PR 界面预览

GitHub Actions 调用独立 Node.js 脚本，用 Playwright 操作构建后的真实 Electron 应用；不调用编码 Agent、LLM 或模型 API，不需要配置模型密钥。

## 运行与查看

- PR 修改界面、Electron、构建脚本或相关依赖后自动触发 `PR UI preview`；首次外部贡献是否需要批准运行，遵循 GitHub 仓库设置。
- PR 会分别构建 base SHA 和 head SHA，并执行同一套操作；手动运行时可填写开放的 PR 编号，留空则只记录所选 `main` 提交。
- 运行结束后下载 `ui-preview-pr-编号-before/after-SHA` artifact，解压并打开 `index.html`，查看截图、逐步结果、错误与未覆盖项；保留 14 天。
- 独立的 `PR UI preview report` 工作流更新 PR 中的一条机器人评论，链接改前／改后报告及日志；只处理当前 PR 最新提交，手动记录 main 时不发评论。
- 不创建预览分支，也不发布安装包；截图随报告保存在 Actions artifact 中，不直接内嵌在 PR 正文。

## 默认操作

1. 创建临时 Markdown 笔记及独立 HOME、用户配置目录。
2. 启动本次构建的 Electron，通过应用现有的 Markdown 文件关联入口打开笔记；新用户引导使用正常按钮退出。
3. 在真实编辑器追加文字，等待文字写入实际 Markdown 文件，截图。
4. 退出并重开同一个应用配置和笔记，确认刚才写入的文字可见，截图。
5. 从侧栏进入通用、外观与主题设置并截图，然后关闭设置。
6. 执行 PR 提供的额外操作（如有），保存逐步结果。

构建、截图数量与流程结果分别记录。任何步骤失败会保留当时界面和错误，工作流失败；兜底截图不能将失败改记为通过。默认流程只覆盖上述动作，其他功能、macOS／Windows 原生能力、全局快捷键及真实外部账号仍需按影响面人工验收。

## 为当前 PR 补充复现操作

默认流程无法展示的交互，可在 PR 正文添加一个 `ui-preview` 代码块，写出实际页面上的 CSS 选择器。改前和改后使用同一份操作，最多 40 步；不需要引入 Agent 或新增测试套件。

````markdown
```ui-preview
[
  {"action": "click", "selector": "button[aria-label='设置']", "caption": "打开设置"},
  {"action": "waitFor", "selector": "[data-settings]:visible"},
  {"action": "shot", "caption": "本次改动涉及的设置界面"},
  {"action": "click", "selector": "button[aria-label='关闭设置']"}
]
```
````

支持 `click`、`fill`（附 `value`）、`press`（附 `key`）、`waitFor`、`shot`；除 `shot` 外均需要 `selector`。不接受 JavaScript、任意命令、注入 Electron bridge 或改写业务状态。额外操作从默认流程关闭设置后的笔记界面开始；如果改前没有新控件，改前记录可能失败，应按报告中的真实原因判断。

PR 正文修改不会自动重跑；需要时在 Actions 中手动运行并填写 PR 编号。新提交会重新执行，旧提交结果不覆盖最新结果。

## 隔离与职责

- `prepare.mjs` 读取 GitHub PR 元数据、锁定 SHA，并提取额外操作。
- `record.mjs` 管理临时环境及 Electron 生命周期；`scenes.mjs` 执行可见界面操作和保存／重开流程。
- `report.mjs` 生成本地 HTML、Markdown 和 JSON 报告。
- `publish.mjs` 在独立可信工作流中读取 GitHub 运行及 artifact 元数据、更新评论，不下载或执行 PR 产物。

录制作业只有仓库只读权限，不传入模型、发布或用户账号密钥；执行 PR 代码的作业与拥有评论权限的作业分离。操作脚本取自 base 提交，应用取自指定 SHA。临时笔记仅用于本次演示，不使用贡献者或维护者的真实笔记，也不向产品加入验收入口。

本地复现仅支持一次性 Linux 环境，需要 Node 22、Bun 1.3.14、Xvfb、窗口管理器及 Electron 系统依赖；先构建应用，再运行脚本：

```bash
npm ci --ignore-scripts --prefix .github/ui-preview
bun install --frozen-lockfile
ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js
bun run build:electron
printf '{"steps":[]}\n' > /tmp/goose-preview-input.json
PREVIEW_INPUT=/tmp/goose-preview-input.json SOURCE_SHA="$(git rev-parse HEAD)" PREVIEW_VARIANT=after \
  xvfb-run -a node .github/ui-preview/record.mjs . /tmp/goose-preview-out
BUILD_OUTCOME=success RECORD_OUTCOME=success SOURCE_SHA="$(git rev-parse HEAD)" PREVIEW_VARIANT=after \
  node .github/ui-preview/report.mjs /tmp/goose-preview-out
```

仅在录制命令退出成功时填写 `RECORD_OUTCOME=success`；失败则填写 `failure`。该预览是云端操作证据，不代替维护者审核或实际发布验收。
