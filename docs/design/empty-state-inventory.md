# 缺省态盘点与极简方向

日期：2026-10-11。目标是让缺省态帮助用户继续操作，同时降低文字、底色、边框与动画的干扰。

本次已修复图片解析期间的破图闪现、真实加载失败的重试，以及自动生成的哈希文件名被当作说明。手写图片说明仍保留。其余缺省态只盘点与设计，尚未统一替换。

## 两个方向

| 方向 | 呈现方式 | 适用场景 |
| --- | --- | --- |
| A · 轻量行（推荐） | 小图标、短句、最多一个动作；没有图标底座或装饰插画；紧凑横排 | 图片/附件待添加、失败、侧栏、搜索、AI、历史 |
| B · 留白画布 | 一块浅色留白、小线性图标；文字集中、动作收敛 | 图片加载、空白主工作区、需要保留位置的媒体 |

建议全局以 A 为基础；图片加载时用 B 保留空间。加载态静止，不能提前显示错误或文件名。状态文字保持可读；去掉装饰，而不是把必要提示变得难以辨认。选中/hover 的侧栏行继续保留 rounded-lg。

设计稿包含图片与附件、空白工作区、侧栏与 AI 三个场景，可切换 A/B 和深色预览。它是只读的比较稿，不写入笔记。

## 完整类型清单

“优先精简”表示依照本次极简偏好值得调整，不表示功能已经失效。除标为实际观察的项目，其余来自源码分支与样式检查，尚未在实际界面触发。

| 类型 | 包含的缺省状态 | 当前呈现与建议 | 优先级 | 来源 |
| --- | --- | --- | --- | --- |
| 图片预览 | 引用解析、网络加载、解码、失败、重试 | 已改静止浅色占位，解析后才设置 src；失败才出现短句与重试 | 已修复、实际操作 | `src/components/editor/blocks/image/ResolvedImagePreview.tsx` |
| 图片说明 | 剪贴板默认名、哈希/UUID 名、手写说明 | 清理 image.png 和 file-<hash>.png 等生成说明，保留 name 与手写说明 | 已修复、实际操作 | `src/components/editor/blocks/image/imageCaption.ts` |
| 待添加图片 | 空图片块 | 虚线外框、灰底、图标底座、标题、副说明同时出现；改一个可点击轻量行 | 高 | `src/components/editor/blocks/shared/MediaPlaceholder.tsx`、`src/pages/workspace/styles/editor-base/files.css` |
| 待添加附件 | 空文件块 | 同样有外框与图标底座；图标和“添加附件”已足够 | 高 | `src/components/editor/blocks/file/customFileBlock.tsx` |
| 待添加视频 | 空视频块 | 复用图片大占位，另带本地视频/压缩说明；改单行“添加视频”，过程说明在操作后出现 | 高 | `src/components/editor/blocks/video/videoBlock.tsx` |
| 媒体上传/处理 | 图片上传、附件上传、视频处理 | 转圈、文字、外框叠加；统一轻量进度，不叠加多种加载提示 | 中 | `src/components/editor/blocks/shared/MediaPlaceholder.tsx` |
| 视频加载 | 引用解析、播放器等待与失败 | 加载用框和转圈；解析失败回落 rawSrc，与图片一样有破引用风险，需另做真实视频验收 | 高、待验证 | `src/components/editor/blocks/video/videoBlock.tsx`、`GooseVideoPlayer.tsx` |
| 附件打开失败 | 读取或打开失败 | 保留原因和一个下一步动作；普通失败不露出底层错误 | 中 | `src/components/editor/blocks/file/customFileBlock.tsx` |
| 未打开笔记/文件夹 | 空白工作区、未关联文件夹 | 大标题、说明、多个带阴影操作卡片占用较大；改一条主提示、一个主按钮，其余文字链接 | 高、实际观察 | `src/pages/workspace/components/page/PageEmptyState.tsx` |
| 空笔记树 | 没有笔记、没有关联本地文件夹 | 目前一句文字，基本简洁；不必添加插画 | 保留、实际观察 | `src/pages/workspace/components/sidebar/tree/TreeEmptyState.tsx` |
| 空子文件夹 | 展开后没有文件 | 小行“暂无文件”已足够；与父目录对齐 | 保留 | `src/pages/workspace/components/sidebar/main-tree/row/renderItem.tsx` |
| 文件夹加载 | 初次读取、缓存已有内容 | 默认八行脉冲骨架偏活跃；有缓存时保留树，首次加载减少骨架行数与动画强度 | 中 | `src/pages/workspace/components/sidebar/LocalFolderLoadingSkeleton.tsx` |
| 文件夹读取失败 | 本地目录读取失败 | 必须与空目录区分；短原因和一次重试，别显示为“暂无文件” | 保留语义 | `src/pages/workspace/components/sidebar/main-tree/SidebarMainTree.tsx` |
| 大纲 | 未打开笔记、没有标题 | 小图标和一句话已经简洁；避免“大纲/文档大纲”重复；有正文时再提供标题用法 | 低、实际观察 | `src/pages/workspace/components/sidebar/SidebarOutline.tsx`、`outline/OutlinePanel.tsx` |
| 搜索 | 未输入、搜索中、无匹配、范围过窄、部分读取失败 | 初始提示、副说明与快捷键文字同时出现；只留主提示，辅助提示靠近操作；无结果最多一个主要动作 | 中、初始态实际观察 | `src/pages/workspace/components/sidebar/SidebarSearch.tsx` |
| 选择器无结果 | 本地路径、字体、代码语言、笔记提及、AI 引用 | 使用一句列表内提示即可；不要引入大图或卡片 | 保留 | `LocalFolderTargetPicker.tsx`、`LocalFontSelect.tsx`、`CodeLanguagePicker.tsx`、`pageMentionMenuItems.tsx`、AI composer 引用模块 |
| 正文输入占位 | 空段落、引用、标题、代码说明 | 普通段落提示较长，速记已无提示；收敛为“输入 / 选择内容”，快捷键帮助按需出现 | 中 | `src/components/editor/core/createEditorOptions.ts`、`blocks/code/CodeBlockHeader.tsx` |
| AI 新会话 | 无消息、侧栏/全屏 | 标题、说明、两条建议和输入提示有重复；保留一句问题和一个低强调建议 | 中 | `src/pages/workspace/components/notebook-ai/ChatMessages.tsx` |
| AI 未配置/不可用 | 关闭、读取设置、未选模型、配置异常、可重试错误 | 已有小图标、短原因与配置/重试动作；继续收敛文案，不加新的插画 | 低 | `src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx` |
| AI 处理 | Drive/Dots/Orbit、处理标签、耗时 | 九格动画、状态文字和持续更新的计时器叠加；统一小进度符号，必要时显示耗时 | 高 | `src/pages/workspace/components/notebook-ai/beautiful-ui/LoadingState.tsx` |
| AI 会话历史 | 没有历史会话 | 一句“暂无历史会话”即可，不需要图形化改造 | 保留 | `src/pages/workspace/components/notebook-ai/ConversationHistoryPopover.tsx` |
| AI 图像产物 | 生成中、SVG 无法显示 | 产物标题和“正在生成图片”重复；保留画布位置与单一状态，失败加可操作的下一步 | 中 | `src/pages/workspace/components/notebook-ai/SvgArtifactCard.tsx` |
| 历史版本 | 无历史、未选版本、读取中、文件缺失、格式异常、渲染失败 | 图标底座、标题、副说明偏重；主状态缩成一句，详细原因按需展开 | 高 | `src/pages/workspace/components/history/history-view/HistoryReader.tsx`、`HistoryVersionList.tsx` |
| Mermaid 图表 | 加载、失败 | 文字提示已相对轻量；延迟加载逻辑有其他在途工作，本次未改 | 保留、源码检查 | `src/components/editor/blocks/mermaid/MermaidView.tsx` |
| 数学公式 | 空公式、公式无法渲染 | 空公式会渲染英文 empty，不合适；建议中文“添加公式”或轻量输入提示 | 高 | `src/components/editor/blocks/math/MathView.tsx` |
| 备份/同步列表 | 无 WebDAV 备份、无 Git 文件夹、无隐藏文件夹 | 一句文字基本足够；帮助说明不要再套图标大卡片 | 保留 | `renderWebdavRemoteBackups.tsx`、`GitFolderList.tsx`、`HiddenFoldersField.tsx` |
| 资源清理 | 未扫描、扫描中、无未引用资源、初始化失败 | 已用短句；无结果改成明确的正常完成反馈，避免用户以为没执行 | 低 | `src/asset-maintenance.tsx` |
| 启动/初始化 | 速记恢复、主窗初始化失败 | emoji 鹅、标题、副说明、进度、原始错误信息偏杂；主窗正常首帧已保持空白，失败应只留原因与重载 | 中 | `src/bootstrap/BootstrapScreen.tsx`、`src/main.tsx` |
| 局部崩溃 | 编辑分屏、AI 面板、历史渲染 | 目前说明“阻止白屏”等实现细节；改“暂时无法显示”＋重试 | 中 | `SplitEditorPane.tsx`、`GuardedNotebookAiPanel.tsx`、`HistoryReader.tsx` |
| 速记/采集 | 空便签、尚无采集内容 | 空便签保留空白是正确方向；采集区一句状态即可 | 保留、空便签实际操作 | `src/pages/quick-note/QuickNoteCollectPreview.tsx`、`QuickNoteApp.tsx` |
| 导出降级占位 | PDF/打印/Word 中不支持的文件、音频、视频 | 是输出格式的内容替代，不是编辑界面缺省图；保留文件名/媒体类型以免丢失语义，避免装饰性 emoji 风格混杂 | 低、需单独导出验收 | `src/lib/pdfExport/blockMappings.tsx`、`printPdf.ts`、`src/lib/docxExport/docxMedia.ts` |

## 实际观察与验证边界

1. 从正常入口打开主工作区：确实观察到大标题、说明和多卡片空态，优先减轻视觉。
2. 切换大纲和搜索：观察到无笔记大纲及搜索初始态。浏览器子任务空间被用户接管后停止，未完成连续搜索、无结果、AI 和设置空列表操作；这些仅列为源码盘点。
3. 从速记正常入口粘贴图片：哈希文件名说明不显示，手写说明保留。
4. 在浏览器施加真实网络限速后粘贴图片：浅色静止占位中不出现破图或文件名，下载完成后显示图片。
5. 粘贴不存在的图片地址：显示“图片无法加载”与重试；将图片文件放到实际 HTTP 服务路径后点重试，显示图片。
6. 连续输入、删除并切换便签：文本编辑可继续，缓存图片重入后正确显示。
7. A/B 预览：实际切换三类场景和深色主题，检查截图；预览动作仅提供反馈，不修改真实笔记。

上述图片操作覆盖共享编辑器真实 DOM、地址解析/加载状态、HTML 粘贴与重试，不是测试套件，也没有注入 mock 文件桥。浏览器没有 Electron preload，不能证明真实笔记文件夹的图片读取或宿主磁盘写入已经验收；原截图中的具体笔记未在本次打开。首次加载尚无自然尺寸时，仅预留固定高度，不能保证页面完全没有布局变化。

静态检查：typecheck、涉及的三个 TS/TSX 文件 lint（零错误，五条提示）与 build 通过。未编写或运行单元、TDD、ERE、E2E 或自动验收用例。
