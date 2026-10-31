# Thinkly 点阵插画审图与候选设计

大纲已按确认稿实施，其余 14 组均为待确认设计。3 组是可选的风格统一，其余聚焦状态含义与加载辨识。

左为改前源码的静态还原，右为候选矢量稿；这些是插画对比，不是宿主界面截图。源码未发现完全漏接动效；旧图保持静帧，播放按钮只演示新稿的动效意图。

- 范围：46 组改前 SVG 样本（含底层图形、重复消费者尺寸和未使用导出）及 21 份当前使用的角色灰度素材，沿页面消费者核对状态语义。不是 46 个独立页面。
- 旧图基线：7704326c；大纲实施提交：c6fc74f5。其余候选没有接入产品。
- 画布保留原已确认 Main，新增 15 个可编辑对照画板；所有画板有 dark 开关。单文件 [动效预览](review.html) 默认浅色且暂停，旧图仅为静态还原。

| 位置 | 审图问题 / 处理 | 现有动效 | 候选动效 | 状态 |
| --- | --- | --- | --- | --- |
| [文档大纲](OutlineReview.dc.html) | 原图像已经存在一组标题，背景和选中带较密；改为纸页与层级标记。 | 原稿已有层级流动和背景涟漪；新稿仅保留四点 12 秒呼吸。 | 12 秒，四点标记轻呼吸。 | 已实施 |
| [未关联本地文件夹](NoFolderReview.dc.html) | 原图像已有目录列表；改为空文件夹与添加标记，明确需要先关联文件夹。 | 已有 9–14 秒微亮、流动和涟漪。 | 12 秒，添加标记缓慢微亮。 | 可选统一风格，待确认 |
| [空文件夹](FolderReview.dc.html) | 原图实心网点较密；改为空心轮廓，与已确认的大纲插画保持相同点径。 | 已有分桶涟漪。 | 12 秒，前侧轻抬 1px、页签微亮。 | 可选统一风格，待确认 |
| [未打开笔记](BookReview.dc.html) | 保留书本语义，收敛纸面填充、光晕和星芒，让空状态与大纲保持同一套轮廓风格。 | 已有书本、星芒和背景的分组循环。 | 12 秒，仅书签缓慢微亮。 | 可选统一风格，待确认 |
| [笔记无法显示](NoteErrorReview.dc.html) | 蓝色断裂波线不够像错误，也没有使用错误语义色；改为纸页与独立警示。 | 已有一次 alert 和内层呼吸/微浮动，蓝色断裂线仍不够像故障。 | 入场一次 280ms 轻移，之后警示环 12 秒轻呼吸。 | 建议调整，待确认 |
| [分屏笔记缺失](SplitMissingReview.dc.html) | 蓝色取景框和省略点更像选择或加载；右侧改为带问号的缺失文档。 | 已有 signal/motion 循环，图形仍更像选区。 | 10 秒，问号轻呼吸；分屏框与左侧内容保持稳定。 | 建议调整，待确认 |
| [Thinkly 无法打开](BootstrapErrorReview.dc.html) | 红色感叹号被文档和光晕包住，体积偏小；改为外置的大警示环。 | 已有一次 280ms alert 与呼吸，不是完全静止。 | 一次 280ms 轻移，随后只让警示环缓慢呼吸。 | 建议调整，待确认 |
| [回顾期间无编辑](ReflectionReview.dc.html) | 平线难以表达回顾和无记录；改为空日历，保留原来的左对齐位置。 | 已有平线 wave、末端 glint 和背景 ripple。 | 12 秒，日历上沿的蓝色标记微亮。 | 建议调整，待确认 |
| [暂无远端备份](WebdavReview.dc.html) | 斜杠云代表断开，实际是备份列表为空；改为云与空备份文件。 | 已有 12 秒按列 flow，不是未接动画。 | 12 秒，空文件中的标记微亮；不显示同步或断线动画。 | 建议调整，待确认 |
| [AI 设置加载](AiLoadingReview.dc.html) | 与未选择模型、服务不可用共用同一星芒；加入具有顺序的加载点。 | 已有 4 秒 progress，透明度仅在 0.9–1 间变化。 | 4 秒，三个点分组依次微亮，保持低频调度。 | 建议调整，待确认 |
| [未选择模型](AiModelReview.dc.html) | 普通星芒不能提示需要选择模型；加入独立的模型卡片与加号。 | 已有 idle：微浮动、星芒微亮和背景涟漪。 | 12 秒，模型卡片加号轻呼吸；不采用加载节奏。 | 建议调整，待确认 |
| [AI 暂不可用](AiErrorReview.dc.html) | 与加载、未选模型共用星芒，错误态仍偏品牌装饰；加入红色警示环。 | 已有 alert，图形与其他 AI 状态相同。 | 一次短促反馈，随后警示环 12 秒轻呼吸。 | 建议调整，待确认 |
| [打开或恢复 Thinkly](BootstrapLoadingReview.dc.html) | 现有加载仅各行做很小的明暗变化；改为更容易分辨的逐行读取节奏，恢复时倒序。 | 已有 4 秒逐行 progress / progress-reverse，透明度 0.9–1。 | 4 秒，三行依次微亮；恢复速记时顺序反向。 | 建议调整，待确认 |
| [添加本地文件夹](SmallFolderPlusReview.dc.html) | 22px 网格采样丢失文件夹和加号；改为直接采样清楚的外轮廓，单独绘制加号。 | 已有 11 秒按列 flow。 | 12 秒，加号轻微明暗变化，图形位置固定。 | 建议调整，待确认 |
| [暂无隐藏文件夹](SmallVisibleReview.dc.html) | 斜杠文件夹像已隐藏或已禁用；改为睁开的眼睛，表达当前没有隐藏项。 | 已有 13 秒按列 flow。 | 12 秒，瞳孔轻微明暗变化，保持睁眼。 | 建议调整，待确认 |

## 消费者追踪

| 候选 | 实际页面消费者 |
| --- | --- |
| 文档大纲 | src/pages/workspace/components/outline/OutlinePanel.tsx |
| 未关联本地文件夹 | src/pages/workspace/components/sidebar/tree/TreeEmptyState.tsx |
| 空文件夹 | src/pages/workspace/components/page/FolderHomePage.tsx |
| 未打开笔记 | src/pages/workspace/components/page/PageEmptyState.tsx |
| 笔记无法显示 | src/pages/workspace/components/editor-split/SplitEditorPane.tsx |
| 分屏笔记缺失 | src/pages/workspace/components/editor-split/SplitEditorPane.tsx |
| Thinkly 无法打开 | src/bootstrap/BootstrapScreen.tsx |
| 回顾期间无编辑 | src/pages/workspace/components/sidebar/reflection/ReflectionDialog.tsx |
| 暂无远端备份 | src/pages/workspace/components/sidebar/settings/data-panel/renderWebdavRemoteBackups.tsx |
| AI 设置加载 | src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx |
| 未选择模型 | src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx |
| AI 暂不可用 | src/pages/workspace/components/notebook-ai/panel/AiUnavailableState.tsx |
| 打开或恢复 Thinkly | src/bootstrap/BootstrapScreen.tsx |
| 添加本地文件夹 | src/pages/workspace/components/sidebar/settings/git-sync/GitFolderList.tsx |
| 暂无隐藏文件夹 | src/pages/workspace/components/sidebar/local-folder-settings/fields/HiddenFoldersField.tsx |

## 保留与排除项

| 范围 | 样本 / 源 | 依据 | 处理 |
| --- | --- | --- | --- |
| 搜索待输入、无结果、搜索失败 | searchIdle / noResults / searchError | 放大镜、问号和故障图形有不同表达，并有状态文案。 | idle、signal / motion、alert 已接入；暂保留。 |
| AI 已关闭、空对话、会话历史 | assistantOff / emptyChat / icon-chat | 关闭、对话和列表入口的语义成立。 | 已有 signal / motion 或 ripple；暂保留。 |
| 笔记历史版本 | history | 时钟与历史的对应明确。 | 已有分组微浮动和涟漪；暂保留。 |
| AI / Git 功能入口、分支空态 | aiGate / gitGate / branch | 星芒与提交图已分别表达两个模块，分支图标语义一致。 | 已有 ripple、glint 或按路径 flow；暂保留。 |
| 目录引导、底纹、三点菜单 | noFolderTrail / noFolderFade / noFolderScatter / treeTrail / treeFade / workspace-dots | 属于辅助引导或装饰；三点菜单沿用通用习惯。 | 已有 flow、ripple、glint；暂保留。 |
| 边角、散点、刻度、点阵边框 | cornerArc / cornerCrosshair / cornerTriangle / decorScatter / decorShard / decorTicks / DotFrameBox | 只作背景与选中提示，不独自承担业务状态；已从大纲空态移除其边角。 | 均经共享运动组件；其余位置暂保留。 |
| 七个角色的头像与选择器 | 7 × main-head / blink-head / wave，共 21 份灰度源图 | 角色名称和外形各异；头像 main 有眨眼，wave 是挥手姿态配浮动，并非手臂动画。 | 源码有 6–9 秒眨眼与 8 秒浮动，离线看过全部当前灰度素材；实际 DPR / 宿主表现未验证，暂保留。 |
| 未发现直接页面消费者的导出 | GlitchArt / workspace-outline / icon-docQuestion / icon-fileX / icon-quote 等 | 库中存在不等于页面实际显示；folderOpen 几何由 FolderEmptyArt 复用，单独区分。 | 不作为线上缺陷，不批量改名或替换。 |

## 主题、动效与验证

- 浅色：surface #fafafa、ink #1f1e1d、accent #547dd0、danger #b42318；深色：#222222、#f0efec、#779de8、#ffb4ab。错误环使用语义色，正文和轮廓沿用 currentColor。
- 静态图片仅输出浅色。18/22/40px 图标同时放大和保留原尺寸，避免只看大图。
- 源码中所有当前使用的点阵入口都已有运动组件/循环或明确的静态条件，没有把低幅动效误报为缺失。旧 progress 的透明度是 0.9–1；新加载稿提高分组差异，保留 4 秒节奏、无百分比。
- 新稿 CSS 只用于审稿；正式接入继续使用共享低频逻辑时钟，不另开连续 rAF 或永久合成层；离屏/后台暂停、恢复续播、reduced-motion 静止均为接入要求。
- 已实施大纲：保留 196×156 边界和原条件/文案/业务；123 点纸页层级，只有 4 个强调色点做 12 秒呼吸；移除该空态的边角装饰。
- 已通过：bun run typecheck（tsrs 不可用时按项目自动回退 tsc）、bunx vite build、git diff --check；独立源码审查没有阻断问题，Impeccable detector 返回 0 项。没有编写或执行测试用例。
- 图像已逐组查看并修正语义、文案对应、文件夹重叠点及警示徽记遮挡；两套主题的候选总览均已审图。角色只做源素材与既有抖动核心的离线图像检查。
- 未验证：真实 Electron 宿主的出入场、离屏/后台恢复、屏幕实际 DPR 与 CPU；EGO 浏览器因自身引导状态未能进行真实预览，未使用其他浏览器工具绕过。
- 此次源代码已提交推送；候选稿待用户确认。所有浅色对照图在 review-images/，逐项 PNG/SVG 和离线 HTML 也交付至 Downloads/Thinkly-点阵审图。
