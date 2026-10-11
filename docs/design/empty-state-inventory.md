# 缺省态盘点与极简方向

日期：2026-10-11。目标是让缺省态帮助用户继续操作，同时降低文字、底色、边框与动画的干扰。

本次已修复图片解析期间的破图闪现、真实加载失败的重试，以及自动生成的哈希文件名被当作说明。手写图片说明仍保留。用户已选择 A「轻量行」。本次继续将工作区、媒体添加、搜索与大纲、AI、历史和局部异常统一为小图标、短句和单个主要动作；原本简洁的列表提示继续保留。

## 两个方向

| 方向 | 呈现方式 | 适用场景 |
| --- | --- | --- |
| A · 轻量行（推荐） | 小图标、短句、最多一个动作；没有图标底座或装饰插画；紧凑横排 | 图片/附件待添加、失败、侧栏、搜索、AI、历史 |
| B · 留白画布 | 一块浅色留白、小线性图标；文字集中、动作收敛 | 图片加载、空白主工作区、需要保留位置的媒体 |

已采用 A 为全局基础；图片加载保留必要的浅色画布位置。加载态静止，不能提前显示错误或文件名。状态文字保持可读；去掉装饰，而不是把必要提示变得难以辨认。选中/hover 的侧栏行继续保留 rounded-lg。

设计稿包含图片与附件、空白工作区、侧栏与 AI 三个场景，可切换 A/B 和深色预览。它是只读的比较稿，不写入笔记。

## 完整类型清单

“优先精简”表示依照本次极简偏好值得调整，不表示功能已经失效。“已实现”与“实际操作”分别表示代码落实和真实浏览器操作；未实际触发的状态仍只算源码检查。

| 类型 | 包含的缺省状态 | 当前呈现与建议 | 优先级 | 来源 |
| --- | --- | --- | --- | --- |
| 图片预览 | 引用解析、网络加载、解码、失败、重试 | 已改静止浅色占位，解析后才设置 src；失败才出现短句与重试 | 已修复、实际操作 | `src/components/editor/blocks/image/ResolvedImagePreview.tsx` |
| 图片说明 | 剪贴板默认名、哈希/UUID 名、手写说明 | 清理 image.png 和 file-<hash>.png 等生成说明，保留 name 与手写说明 | 已修复、实际操作 | `src/components/editor/blocks/image/imageCaption.ts` |
| 待添加图片 | 空图片块 | 已改为 44px 可点击轻量行：小图标和“添加图片”，无虚线、图标底座及副说明 | 已实现、实际操作 | `src/components/editor/blocks/shared/MediaPlaceholder.tsx`、`src/pages/workspace/styles/editor-base/files.css` |
| 待添加附件 | 空文件块 | 复用轻量媒体行，显示“添加附件”；操作提示保留在悬停提示中 | 已实现、源码检查 | `src/components/editor/blocks/file/customFileBlock.tsx` |
| 待添加视频 | 空视频块 | 复用轻量媒体行，显示“添加视频”；本地视频提示保留在悬停提示中 | 已实现、源码检查 | `src/components/editor/blocks/video/videoBlock.tsx` |
| 媒体上传/处理 | 图片上传、附件上传、视频处理 | 共享占位改为 44px 单行、一个静止进度符号和状态文字，去掉外框 | 已实现、源码检查 | `src/components/editor/blocks/shared/MediaPlaceholder.tsx` |
| 视频加载 | 引用解析、播放器等待与失败 | 加载用框和转圈；解析失败回落 rawSrc，与图片一样有破引用风险，需另做真实视频验收 | 高、待验证 | `src/components/editor/blocks/video/videoBlock.tsx`、`GooseVideoPlayer.tsx` |
| 附件打开失败 | 读取或打开失败 | 保留原因和一个下一步动作；普通失败不露出底层错误 | 中 | `src/components/editor/blocks/file/customFileBlock.tsx` |
| 未打开笔记/文件夹 | 空白工作区、未关联文件夹 | 改小标题、一句说明、一个主按钮及低强调文字链接，移除操作卡片、阴影与 AI 装饰动画 | 已实现、实际操作 | `src/pages/workspace/components/page/PageEmptyState.tsx` |
| 空笔记树 | 没有笔记、没有关联本地文件夹 | 目前一句文字，基本简洁；不必添加插画 | 保留、实际观察 | `src/pages/workspace/components/sidebar/tree/TreeEmptyState.tsx` |
| 空子文件夹 | 展开后没有文件 | 小行“暂无文件”已足够；与父目录对齐 | 保留 | `src/pages/workspace/components/sidebar/main-tree/row/renderItem.tsx` |
| 文件夹加载 | 初次读取、缓存已有内容 | 八行脉冲骨架改为小文件夹图标和“正在读取文件夹”；原有读取与缓存逻辑保留 | 已实现、源码检查 | `src/pages/workspace/components/sidebar/LocalFolderLoadingSkeleton.tsx` |
| 文件夹读取失败 | 本地目录读取失败 | 必须与空目录区分；短原因和一次重试，别显示为“暂无文件” | 保留语义 | `src/pages/workspace/components/sidebar/main-tree/SidebarMainTree.tsx` |
| 大纲 | 未打开笔记、没有标题 | 空态改横排小图标和短句；额外用法说明按需展开 | 已实现、实际操作 | `src/pages/workspace/components/sidebar/SidebarOutline.tsx`、`outline/OutlinePanel.tsx` |
| 搜索 | 未输入、搜索中、无匹配、范围过窄、部分读取失败 | 初始只显示“输入关键词开始搜索”；无匹配显示短句和一个扩大范围/清空动作，空态不显示快捷键页脚 | 已实现、实际操作 | `src/pages/workspace/components/sidebar/SidebarSearch.tsx` |
| 选择器无结果 | 本地路径、字体、代码语言、笔记提及、AI 引用 | 使用一句列表内提示即可；不要引入大图或卡片 | 保留 | `LocalFolderTargetPicker.tsx`、`LocalFontSelect.tsx`、`CodeLanguagePicker.tsx`、`pageMentionMenuItems.tsx`、AI composer 引用模块 |
| 正文输入占位 | 空段落、引用、标题、代码说明 | 普通段落收敛为“输入 / 选择内容”；速记继续留白 | 已实现、源码检查 | `src/components/editor/core/createEditorOptions.ts`、`blocks/code/CodeBlockHeader.tsx` |
| AI 新会话 | 无消息、侧栏/全屏 | 保留“想怎么修改这篇笔记？”和一个“润色这段文字”低强调建议，去掉副说明和箭头 | 已实现、源码检查 | `src/pages/workspace/components/notebook-ai/ChatMessages.tsx` |
| AI 未配置/不可用 | 关闭、读取设置、未选模型、配置异常、可重试错误 | 小图标、短状态及一个设置或重试动作；异常原因按需展开 | 已实现、源码检查 | `src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx` |
| AI 处理 | Drive/Dots/Orbit、处理标签、耗时 | 九格动画改为一个小进度符号；默认不显示耗时，仅明确需要时启动计时 | 已实现、源码检查 | `src/pages/workspace/components/notebook-ai/beautiful-ui/LoadingState.tsx` |
| AI 会话历史 | 没有历史会话 | 一句“暂无历史会话”即可，不需要图形化改造 | 保留 | `src/pages/workspace/components/notebook-ai/ConversationHistoryPopover.tsx` |
| AI 图像产物 | 生成中、SVG 无法显示 | 生成中保留画布位置与单一状态，去掉重复标题；失败显示一个小图标和短句 | 已实现、源码检查 | `src/pages/workspace/components/notebook-ai/SvgArtifactCard.tsx` |
| 历史版本 | 无历史、未选版本、读取中、文件缺失、格式异常、渲染失败 | 小图标与短状态，去掉图标底座和重复说明，文件缺失原因按需展开；渲染失败只保留一次重试 | 已实现、源码检查 | `src/pages/workspace/components/history/history-view/HistoryReader.tsx`、`HistoryVersionList.tsx` |
| Mermaid 图表 | 加载、失败 | 文字提示已相对轻量；延迟加载逻辑有其他在途工作，本次未改 | 保留、源码检查 | `src/components/editor/blocks/mermaid/MermaidView.tsx` |
| 数学公式 | 空公式、公式无法渲染 | 空公式显示中文“添加公式”，不再渲染英文 empty；有内容的公式渲染不变 | 已实现、源码检查 | `src/components/editor/blocks/math/MathView.tsx` |
| 备份/同步列表 | 无 WebDAV 备份、无 Git 文件夹、无隐藏文件夹 | 一句文字基本足够；帮助说明不要再套图标大卡片 | 保留 | `renderWebdavRemoteBackups.tsx`、`GitFolderList.tsx`、`HiddenFoldersField.tsx` |
| 资源清理 | 未扫描、扫描中、无未引用资源、初始化失败 | 已用短句；无结果改成明确的正常完成反馈，避免用户以为没执行 | 低 | `src/asset-maintenance.tsx` |
| 启动/初始化 | 速记恢复、主窗初始化失败 | 启动状态改小图标和短句，移除 emoji、副说明与进度条；失败原因按需展开并保留重新加载 | 已实现、源码检查 | `src/bootstrap/BootstrapScreen.tsx`、`src/main.tsx` |
| 局部崩溃 | 编辑分屏、AI 面板、历史渲染 | 编辑分屏、AI 面板和历史统一为“暂时无法显示”＋重试，不显示“阻止白屏”等实现用语 | 已实现、源码检查 | `SplitEditorPane.tsx`、`GuardedNotebookAiPanel.tsx`、`HistoryReader.tsx` |
| 速记/采集 | 空便签、尚无采集内容 | 空便签保留空白是正确方向；采集区一句状态即可 | 保留、空便签实际操作 | `src/pages/quick-note/QuickNoteCollectPreview.tsx`、`QuickNoteApp.tsx` |
| 导出降级占位 | PDF/打印/Word 中不支持的文件、音频、视频 | 是输出格式的内容替代，不是编辑界面缺省图；保留文件名/媒体类型以免丢失语义，避免装饰性 emoji 风格混杂 | 低、需单独导出验收 | `src/lib/pdfExport/blockMappings.tsx`、`printPdf.ts`、`src/lib/docxExport/docxMedia.ts` |

## 实际观察与验证边界

1. A/B 设计稿已实际切换三类场景和深色主题；用户选择 A 后，主工作区已复验小标题、短说明、主按钮和文字链接。
2. 搜索从正常入口连续输入、删除，再扩大到所有笔记本：无结果时只保留短句和一个动作。初始空态不显示快捷键页脚。清空后回到初始提示；搜索与大纲在浅色、深色均检查截图，主题和搜索范围已恢复原设置。未用性能记录证明“流畅”。
3. 从速记正常入口添加空图片块：真实占位是 44px 横排小图标和短句；没有图标底座、边框或副说明。
4. 从速记正常入口粘贴图片：生成文件名说明不显示，手写说明保留。浏览器真实网络限速时，加载画布静止，图片未完成前隐藏，完成后显示图片。
5. 粘贴不存在的图片地址：显示 44px 的“图片无法加载”与重试；将图片文件放到真实 HTTP 服务路径后点重试，恢复显示并可继续输入和删除。
6. 速记菜单没有公式、附件和视频入口；浏览器也没有 Electron preload，无法从正常入口打开真实磁盘笔记。因此这些媒体入口、真实文件夹读取、历史版本、宿主磁盘写入和原截图中的具体笔记仍未做实际操作验收。
7. AI 设置开关实际为关闭，未打开笔记时没有可达的 AI 面板入口。AI 不可用、新会话、处理、图像生成、启动错误和局部渲染异常仅完成代码与静态检查，未通过请求 AI 或注入错误制造验收状态。

上述图片操作覆盖共享编辑器真实 DOM、加载状态、HTML 粘贴与重试，没有注入 mock 文件桥。图片首次加载尚无自然尺寸时仅预留固定高度，不能保证页面完全没有布局变化。

静态检查：typecheck、build 与相关 TS/TSX lint（零错误，现有提示保留）通过。未编写或运行单元、TDD、ERE、E2E 或自动验收用例。
