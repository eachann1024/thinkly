# 公共控件维护台账

维护范围：应用界面、编辑器适配、速记、资源清理窗口、预览、导出及原生宿主。状态以源码归属为依据，实际操作另记，不能把静态接入写成已通过视觉验收。

## 唯一维护入口

| 家族 | 公共入口/适配 | 当前状态与边界 |
|---|---|---|
| Button / IconButton / Toolbar | `components/ui/button`、`icon-button`、`control-recipes` | 公共视觉来源已建立；editor/ui 出口做薄适配；逐消费者核查 |
| Input / Textarea / Field | `components/ui/input`、`textarea`、`field` | 公共关联 label/help/error；行内输入通过 variant 表达，保留 IME/blur 事件 |
| NativeSelect / Combobox | `components/ui/select`、公共 Popover/Menu | 原生 Select 已建立；字体/模型虚拟候选保留测量，尚需入口验收 |
| Checkbox / Radio / Switch | `components/ui/checkbox`、`radio`、`switch` | 真实 checked/indeterminate/disabled；HeroUI 仅由 Checkbox 适配器直接依赖 |
| Range / Number | `components/ui/range`、数值 Input | 保留原生拖动和值域；业务即时预览属于消费者 |
| Menu / ContextMenu / Submenu | `dropdown-menu`、`context-menu/*`、`styles/global/menu-items.css` | root/group/row 都消费公共间隙；radio/listbox 分组与子菜单需实际观察 |
| InteractiveRow / TreeRow | `list-row`、`styles/global` 共享 interactive 规则与业务行适配 | 业务拥有树/虚拟化；主树/收藏/分组仍必须 rounded-lg |
| Tabs / Navigation / Segmented | `tabs`、`segmented-control` + 业务导航适配 | 公共键盘薄封装已建立；业务可排序标签保持 DnD，消费者迁移与操作仍需记录 |
| Popover / Tooltip / Dialog | `popover/*`、`tooltip`、`dialog`、`dialog-shell` | Dialog 按 ModalOverlay → AriaModal → AriaDialog 保留真实模态层级与引擎焦点/Escape/portal；业务不能复制通用浮层颜色 |
| Card / SettingsOptionRow | `selectable-card` 与唯一共享 CSS recipe `.goose-settings-option-row` | 普通内容卡与选择卡分开；SettingsOptionRow 由共享 recipe 唯一维护；迁移进度以逐文件清单为准 |
| Badge / Kbd / Label / Separator | 对应 `components/ui` 出口 | 展示语义，不赋予多余点击行为 |
| Scroll / Resize | `scroll-area` 与宿主布局适配 | 命中区、separator/slider 数值及连续轨道需实际确认 |
| Toast / Progress / Error | `sonner`、公共 Button/语义变量 | 保留反馈文案与异步行为；不替业务改错误语义 |
| Disclosure | `disclosure`（原生 details/summary 薄封装）+ 公共状态规则 | 保留原生键盘行为；仅统一界面外壳 |
| Media / Preview | 公共控件 context=media + 渲染器适配 | 视频暗底、正文内容色、导出纸色是有名称的例外 |
| Chart / RenderedDocument | ECharts option、iframe 外观快照、静态导出样式 | 内容颜色不算 UI 按钮缺陷；独立 document 必须显式传递主题 |
| Host | Electron 原生主题/菜单/对话框 | OS 拥有实际控件；不承诺应用 CSS 可以覆盖 |

## 状态与主题归属

控件内部尺寸、圆角、图标槽、hover、pressed、focus-visible、selected、checked、invalid、disabled 归公共组件/共享语义。业务只拥有外部宽度、排列、文本截断、值和事件。open 不等于 selected，keyboard-active 不等于已确认选项。disabled 优先于可用交互；复合状态不得改变行高或侵入相邻高亮留白。

迁移以原有界面为视觉基线。先解析仓库实际的 Tailwind 映射和 CSS 变量，再将原值移到公共 recipe；不能套用框架默认值，也不能将随界面缩放的 rem 改为固定 px。已有图标尺寸、容器布局、虚拟行坐标和圆角变体必须保留。原生按钮迁移可使用 `contentStyle="preserve"`，原有样式仍由明确的家族变体逐步收敛；公共默认值不得覆盖这些入口的业务布局。每批迁移后，从原入口观察尺寸、状态和明暗主题，再记实际验收结果。

主题切换调用 `useSettings.setTheme` / `setAccentColor`，系统主题由集中生命周期解析。界面缩放使用 `setUIFontSize`（百分比，85–130）；目前没有密度设置 API，样本只展示公共尺寸变体，不伪造持久化密度。Portal 按物理 DOM 祖先继承 CSS，独立窗口必须初始化同一外观快照。内容色/导出纸面/媒体暗底和原生系统控件是独立命名边界。

## 候选逐文件台账

完整机器可读清单在 `docs/ui-control-inventory.json`：保留原始扫描的每个候选路径、家族、所属窗口、入口、源码性质、迁移状态和未验收说明。其状态包括公共实现、公共消费者待验收、待迁移、第三方适配、原生宿主、文档内容、状态逻辑、状态样式、尚待确认。原始正则命中不是控件数量；颜色与选择器命中不能自动认定可见缺陷。没有实际操作记录的条目明确写“未记录”。

更新公共家族时重新运行静态清单，逐条检查 consumers 的 import/自动导入/本地遮蔽，更新对应台账；迁移完成应补正常业务入口和实际操作结论。供应商升级重点核对 slot、state、portal 和布局容器，不全项目逐处加补丁。

## 静态清单与新增旁路

运行 `node scripts/audit-ui-controls.mjs --out work/ui-controls-report.json`（先创建 work 目录）。报告 raw、imperative、native、vendor、raw-color、local-dark、important、token-redefinition、auto-import-ambiguity，并列出 JSX 控件解析来源。

JSX 用 TypeScript AST 识别小写原生标签；显式 import 优先，其次本地绑定，再解析 `config/vite/autoImportEntries.ts` 的真实 unimport 导出。没有显式 import 的 Button/Input 不直接判为旁路。大小写 unresolved 仅保留来源记录，避免误把业务组件当作公共控件。源码色值/主题/important 正则只是审查候选，可能包含内容、字符串或注释，需要人工归属。

`config/ui-control-policy.json` 的 allowedOwners 仅允许公共原语/集中主题/宿主；exceptions 必须具体到文件与类别并解释原因。baseline 是逐条内容签名的现有待处理项，不是业务文件豁免；改变或新增内容会重新出现在 new。行号变化不造成全部基线失效。`--out` 时 stdout 只输出摘要与文件路径，完整候选保存在报告文件。颜色仅识别字面值，不把 `hsl(var(--…))` 当硬编码色。报告保留 adapter、exception、pending、new 四种状态，不测试、不做自动断言、不以退出码宣称通过。

baseline 只接受人工确认的内容、原生、布局例外，逐条填写 id、file、category、classification、reason；真正控件旁路继续报告 new。`--refresh-baseline` 仅清理已不存在或缺少人工分类/原因的旧条目，绝不会批量接纳当前候选。允许公共适配器直接使用供应商；业务新增供应商依赖必须迁入适配层或登记具体例外。

## 有依据的例外

- `lib/export/index.ts` 与 `settings-dialog/useSettingsImportExport.tsx`：隐藏文件 input 调用 OS 选择器；保留 accept、取消、change 和用户手势，无可见控件外壳。
- `editor/ai/composer/composerImageChip.ts`：ProseMirror 命令式 DOM 移除按钮不能直接渲染 React Button；消费公共 CSS 并保留可访问名称。
- 导出媒体、Markdown 解析器、完整用户 HTML：文档内容与应用界面分开；不能为统一样式改持久化标记或用户正文色。
- `appHotkeys`、`escape-close`、字体预览确认：选择器/事件时序不是可见控件；保留 role、data-state、IME 优先级和 keydown/keyup 成对确认。
- 拖拽树、字体虚拟列表、历史连续轨道：保留测量/命中区与轨道，采用内层背景 inset；不直接给绝对定位行加 margin。
- BlockNote/Mantine 宿主渲染器保留供应商引擎；只允许明确的宿主入口，不能以整个 editor 目录作为 vendor 豁免。

## 开发样本页

唯一入口：开发服务器正常 URL 加 `?control-gallery=1`，仅 `import.meta.env.DEV` 接入 `src/dev/control-gallery/index.tsx` 的 `ControlGallery`。生产构建不得路由到该页。

样本使用真实公共 Button、IconButton、Input、Field、Textarea、Select、Range、Checkbox、Radio、Switch、DropdownMenu、ContextMenu/Submenu、Popover、Dialog，以及公共 Tabs 和 SegmentedControl。主题/强调色/界面缩放走真实设置 API，会持久化。hover/pressed/focus 来自真实操作，不强制伪类；多组菜单默认选第一行，可移到第二行检查实际背景间隙。

此页是人工观察工具。业务 IME、编辑器选区、拖拽、虚拟定位、多窗口实时主题和宿主对话框仍从原业务入口验收，不能用样本页代替。

## 静态 lint 保护

`eslint.config.js` 注册 `goose-ui/public-controls`：业务新增可见原生 button/input/select/textarea/details/summary 或供应商控件依赖报错。公共 owners 和逐条签名 baseline 例外允许；新增或修改签名需重新审核。规则不限制文档 video/audio，不自动批准隐藏 file input；已有两个上传入口已按确切签名登记原生例外。editor/vendor-menu 是唯一精确供应商薄适配出口。其余颜色、local-dark、important 候选继续在审计报告呈现，未批量入基线。

当前保留 10 条 raw 签名，分别属于文档媒体/Markdown内容、OS隐藏上传/Windows宿主。原 Git details/summary 的 6 条签名已随公共控件接入消失，清理时只移除旧项，没有接纳新增候选。pending 表示已审核源码例外，绝不表示已浏览器验收。UI样本、业务入口与跨窗口行为尚需真实操作；静态lint不能替代。

## 最终候选树静态记录

最终候选树清单扫描 1,393 个源码文件，记录 1,895 个 JSX 控件命中；这不是独立控件数量。当前 adapter 1,140、exception 3、pending 10、new 931，未分类 raw/imperative/vendor/自动导入歧义控件旁路为 0。931 个其余颜色、局部主题、important 等候选仍保留报告，不能据此宣称全部样式已清理或完整视觉验收通过。

`ui-control-inventory.json` 保留原始 259 个候选，并按最终树刷新当前 JSX 来源与行号；新增文件放在 supplementalCurrentControls，具体模态层级和复选状态放在 finalAdapterRecords。

资源清理的全选复选框（`src/asset-maintenance.tsx:134`）直接消费 allSelected、partiallySelected 和 busy 状态；逐项复选框（同文件 :152）消费真实 selected 集合及 busy 禁用条件。样本页（`src/dev/control-gallery/forms.tsx:43–45`）展示受控选中、部分选中、禁用且选中，均由公共 Checkbox 实现。Dialog 在 `src/components/ui/dialog.tsx:121` 明确包含 AriaModal，保留 React Aria 所需的 ModalOverlay → Modal → Dialog 层级。这里只记录源码事实；鼠标、键盘、焦点恢复、深浅色及原生窗口结果以主会话实际操作记录为准。
