# 表格选区：两版 HTML 设计

- A 版：打开 `theme-tint.html`，轻薄主题填色、完整网格、独立工具栏。
- B 版：打开 `quiet-frame.html`，极弱填色、连续外框、活动格、列标题提示和表格顶部工具条。
- 两版共用本目录资源，保留目录完整即可直接打开，无需安装、构建或联网。
- 如需各自单文件分享，可在已安装项目依赖的环境运行 `node docs/design/table-selection/build-preview.mjs <输出目录>`，生成内嵌样式、脚本和图标的两个 HTML，打开成品不依赖项目。
- 主题色和明暗选择会通过版本链接的查询参数传递；预览内容只保存在当前页面内存中，刷新恢复。
- 全部示例内容为虚构数据；没有复制用户截图里的账号、凭证、设备 ID 或局域网地址。

## 建议

先采用 A 的配色与工具栏位置修正。它对现有编辑器改动较小，也更贴近主题。B 更适合偏好安静表格、低视觉密度的用户，可再单独决定是否采用。

浅色选区随当前强调色，深色默认采用低饱和通用蓝 `#8caedc`；两版均支持深色“跟随主题”对比。深色不能简单复制浅色高饱和背景；正文仍用正常文本色，选区轮廓独立表达范围。

## 截图中可见的问题与改进

| 优先级 | 问题与证据 | 改进 |
| --- | --- | --- |
| P1 | 截图中灰色大块与蓝框分离，内容和选中状态层次不清。 | 独立表格选区 token，填色减轻，外轮廓保持清楚。 |
| P1 | 浮动工具栏盖住表头，部分列名无法完整阅读。 | A 在表头前预留工具栏位置，B 使用表格上方工具条；正式实现须结合视口避让。 |
| P1 | 截图只有选区矩形，不能区分活动格与范围。 | 2px 范围轮廓、1px 活动格内框；键盘焦点独立，失焦降低强度并用虚线表达。 |
| P2 | 长标识换行造成行高不齐，等宽列未照顾内容长度。 | 依据内容分配列宽、长标识等宽排版、自然断行；不截断真实内容，窄窗在表格内横向滚动。 |
| P2 | 文字格式、对齐、AI 操作密集，所有操作视觉权重接近。 | 常用操作直接展示；低频操作折叠，AI 在合适选区状态显示。原型只展示常用操作。 |
| P2 | 拖拽点与加号分散，截图左侧控件被裁切。 | 固定侧沟容纳行入口，新建入口贴近表格，悬停与键盘聚焦均可见。 |

截图不能证明实际交互时序、键盘行为或完整可访问性合规。失焦、缩放、合并单元格等是需要补齐的状态设计，不声称已从原截图复现缺陷。

## 源码依据与调用链

1. `src/components/editor/core/useEditorExtensions.ts` 注册 `gooseTableCellSelectionExtension`。
2. `src/components/editor/extensions/tableCellSelectionView.ts` 与 `tableCellSelectionDom.ts` 处理指针选区，`tableCellSelectionModel.ts` 处理跨格和跨表选择。
3. `src/components/editor/extensions/tableCellSelectionExtension.ts` 从当前 `CellSelection` 推导四向边缘 Decoration；它是临时视图状态，没有写入文档属性。
4. `src/pages/workspace/styles/editor-base/tables-callouts/table-surface.css:97` 使用 `--goose-editor-selection-bg` 绘制选区；底色叠层目前使用不透明颜色，遮住原单元格颜色，但没有删除持久化属性。
5. `src/lib/accentColor.ts:20` 将深色编辑器选区设为 `var(--goose-dark-selection-bg, #444444)`；`src/lib/accentOutlineTokens.ts` 独立提供各主题边框色，因此出现灰底与强调色边框分离。
6. `src/components/editor/toolbars/formatting/GooseFormattingToolbarController.tsx:103` 将浮动工具栏锚定在选区上方，使用 10px 偏移及上下翻转；截图说明该位置可能侵入同表格的表头区域，不能仅靠视口避让解决。
7. `src/components/editor/toolbars/formatting/FormattingToolbarLayout.tsx` 直接消费选区能力、格式状态与 AI 能力；`EditorComposer.tsx` 按入口选择固定或浮动工具栏。
8. `src/stores/settings/index.ts` 持久化用户设置；`src/stores/settings/theme.ts` 在明暗切换后重新应用强调色和运行时变量。正式方案应在该链路更新表格专用 token，不改变笔记内容。

## 正式接入建议

- 增加 `--goose-table-selection-fill`、`--goose-table-selection-border`、`--goose-table-selection-active`、`--goose-table-selection-inactive`，避免改动文本原生选区、侧栏或其他共享控件。
- 填色使用透明叠层，保留自定义单元格颜色、表头语义和文字色；不使用文字反白掩盖对比问题。
- 沿用现有 Selection / Decoration，只改变视图样式；取消选择后完整恢复原有底色，历史、保存、复制与导出不带选区装饰。
- 工具栏只对 `cellGrid` 增加避让规则，保留正文、跨块、跨表、图片、链接与独立速记路径。
- 为宽度受限的分栏、200% 缩放和触屏保留横向滚动；工具栏压缩低频操作，不能遮住当前格与表头。
- 本原型的列比例和自然换行用于说明方向，正式实现继续尊重已有列宽、合并单元格与内容属性。

## 原型范围

- 已实现：九种主题色，浅色 / 深色 / 跟随系统，深色通用蓝 / 跟随主题，单格、多格、整行、整列、无选区，鼠标拖选，Shift 扩选，方向键、Enter 编辑、Esc 取消、全选、复制，格式切换、添加行、原有底色、失焦与重置。
- 未实现：ProseMirror / BlockNote 集成，合并单元格，真实笔记持久化，撤销历史，AI，行列排序，列扩展，跨表选择，导出。
- 最小验收：浏览器人工操作明暗与强调色、两版布局、拖选及键盘操作，检查窄窗没有页面横向溢出，选区取消后恢复原有底色；不编写、不运行测试用例。
- 这是设计文档和独立预览资源，不修改应用运行时代码、应用版本或安装包。
- 图标由项目已安装的 `@phosphor-icons/react` 导出，保留该依赖的 MIT 许可，见 `icons-LICENSE.txt`。

## 本次检查记录（2026-10-15）

- 环境：macOS / Ego Lite（Chromium）；本地 `file://` 直接打开，另提供仅监听本机的 HTTP 预览。
- 已实际查看 A / B 在浅色和深色下的 1440×1040 画面；原型截图保存在本地验收目录，没有提交用户原图或临时截图。
- 已检查 B 浅色与 A 深色的 390×844 窄窗口：页面宽度保持 390px，横向滚动仅发生在表格区域，工具栏没有横向溢出。
- 已操作鼠标拖选（3 行 × 2 列）、键盘扩选（2 行 × 2 列）、加粗、Esc 取消、编辑保存、新增行与重置；取消选择后原有底色保留，选区叠层消失。
- 已检查深色通用蓝与跟随主题切换，以及跟随系统的主题解析；已查看松绿、珊瑚和葡萄配色，没有对全部九种主题逐一进行人工视觉验收。
- 已通过 JavaScript 语法检查；没有编写或运行测试用例。真实编辑器、真实设备触屏、剪贴板内容及完整辅助技术行为不在本次验收范围。
