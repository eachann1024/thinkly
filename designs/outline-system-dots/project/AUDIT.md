# Thinkly 点阵插画审图与实施记录

仅实施用户点名的 8 项，并分别增加不同的低频动态背景。未点名的 7 项均保留原版，之前候选已撤下；空文件夹和未打开笔记明确保留原版。

左为改前源码的静态还原，右为本轮已实施的矢量稿；这些是插画对比，不是宿主界面截图。旧图保持静帧，播放按钮用于离线演示新版动效。

- 范围：46 组改前 SVG 样本（含底层图形、重复消费者尺寸和未使用导出）及 21 份当前使用的角色灰度素材，沿页面消费者核对状态语义。不是 46 个独立页面。
- 旧图基线：7704326c；大纲实施提交：c6fc74f5。本次仅将点名的 7 份其余候选接入产品；大纲此前已接入，本次增加背景。
- 画布保留 Main 和 8 个可编辑对照画板；对照画板支持 dark 与 animate 开关。单文件 [动效预览](review.html) 默认浅色且暂停，旧图仅为静态还原。

| 位置 | 审图问题 / 处理 | 现有动效 | 候选动效 | 状态 |
| --- | --- | --- | --- | --- |
| [文档大纲](OutlineReview.dc.html) | 原图像已经存在一组标题，背景和选中带较密；改为纸页与层级标记。 | 原稿已有层级流动和背景涟漪；新稿仅保留四点 12 秒呼吸。 | 层级轨迹，12 秒错峰明暗变化；沿用前景状态动效。 | 已实施 |
| 未关联本地文件夹 | 候选未通过，本轮保留原版。 | 已有 9–14 秒微亮、流动和涟漪。 | 沿用现有动效。 | 保留原版，不实施 |
| 空文件夹 | 候选未通过，本轮保留原版。 | 已有分桶涟漪。 | 沿用现有动效。 | 保留原版，不实施 |
| 未打开笔记 | 候选未通过，本轮保留原版。 | 已有书本、星芒和背景的分组循环。 | 沿用现有动效。 | 保留原版，不实施 |
| 笔记无法显示 | 候选未通过，本轮保留原版。 | 已有一次 alert 和内层呼吸/微浮动，蓝色断裂线仍不够像故障。 | 沿用现有动效。 | 保留原版，不实施 |
| 分屏笔记缺失 | 候选未通过，本轮保留原版。 | 已有 signal/motion 循环，图形仍更像选区。 | 沿用现有动效。 | 保留原版，不实施 |
| [暂时无法打开](BootstrapErrorReview.dc.html) | 红色感叹号被文档和光晕包住，体积偏小；改为外置的大警示环。 | 已有一次 280ms alert 与呼吸，不是完全静止。 | 断续边框与短线，14 秒交错呼吸；沿用前景状态动效。 | 已实施 |
| 回顾期间无编辑 | 候选未通过，本轮保留原版。 | 已有平线 wave、末端 glint 和背景 ripple。 | 沿用现有动效。 | 保留原版，不实施 |
| [暂无远端备份](WebdavReview.dc.html) | 斜杠云代表断开，实际是备份列表为空；改为云与空备份文件。 | 已有 12 秒按列 flow，不是未接动画。 | 分层云弧，12 秒由内向外微亮；沿用前景状态动效。 | 已实施 |
| [正在读取 AI 设置](AiLoadingReview.dc.html) | 与未选择模型、服务不可用共用同一星芒；加入具有顺序的加载点。 | 已有 4 秒 progress，透明度仅在 0.9–1 间变化。 | 读取横线，4 秒分组依次微亮；沿用前景状态动效。 | 已实施 |
| [尚未选择模型](AiModelReview.dc.html) | 普通星芒不能提示需要选择模型；加入独立的模型卡片与加号。 | 已有 idle：微浮动、星芒微亮和背景涟漪。 | 错位卡片边框，14 秒错峰轻呼吸；沿用前景状态动效。 | 已实施 |
| [AI 暂不可用](AiErrorReview.dc.html) | 与加载、未选模型共用星芒，错误态仍偏品牌装饰；加入红色警示环。 | 已有 alert，图形与其他 AI 状态相同。 | 两侧疏密散点，14 秒错峰微亮；沿用前景状态动效。 | 已实施 |
| [正在打开Thinkly](BootstrapLoadingReview.dc.html) | 替换正在打开的图形与读取节奏，并补齐正常启动显示入口；恢复速记保留原版。 | 原组件已有 4 秒逐行 progress / progress-reverse，透明度 0.9–1，但 full 启动未挂载加载图。 | 四行读取阵列，4 秒依次微亮；沿用前景状态动效。 | 已实施 |
| 添加本地文件夹 | 候选未通过，本轮保留原版。 | 已有 11 秒按列 flow。 | 沿用现有动效。 | 保留原版，不实施 |
| [暂无隐藏文件夹](SmallVisibleReview.dc.html) | 斜杠文件夹像已隐藏或已禁用；改为睁开的眼睛，表达当前没有隐藏项。 | 已有 13 秒按列 flow。 | 视野弧线，12 秒扩散明暗变化；沿用前景状态动效。 | 已实施 |

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
- 静态图片仅交付浅色；18px 图标同时保留放大视图和原尺寸。深色做离线检查。
- 既有点阵组件均定义了运动/循环或明确的静态条件；原 full 启动缺少 loading 挂载入口，本轮补齐。没有把低幅动效误报为缺失。旧 progress 的透明度是 0.9–1；新加载稿提高分组差异，保留 4 秒节奏、无百分比。
- 产品前景与背景都使用 DotMatrixMotion / DotGroup 和共享低频逻辑时钟；不增加逐帧 rAF。保留离屏/后台暂停、恢复续播与 reduced-motion 静止路径。新加载组件局部设置 --dm-progress-low=0.55，其他已有 progress 仍默认 0.9。
- 已实施大纲：保留 196×156 边界和原条件/文案/业务；123 点纸页层级，前景只有 4 个强调色点做 12 秒呼吸；本次在空态容器增加层级轨迹背景。
- 上一轮大纲检查：typecheck（tsrs 不可用时自动回退 tsc）、vite build、diff 检查通过；当时的独立源码审查没有阻断问题，Impeccable detector 为 0 项。本轮检查单列于末尾，不编写或执行测试用例。
- 图像已逐组查看并修正语义、文案对应、文件夹重叠点及警示徽记遮挡；两套主题的候选总览均已审图。角色只做源素材与既有抖动核心的离线图像检查。
- 未验证：真实 Electron 宿主的出入场、离屏/后台恢复、屏幕实际 DPR 与 CPU；EGO 浏览器因自身引导状态未能进行真实预览，未使用其他浏览器工具绕过。
- 用户点名的 8 项已经接入源码；其余保持原版。浅色对照图在 review-images/，逐项 PNG/SVG 和离线 HTML 同步至 Downloads/Thinkly-点阵审图。

## 本轮实施范围与背景

| 状态 | 背景设计与动效 |
| --- | --- |
| 文档大纲 | 层级轨迹，12 秒错峰明暗变化 |
| 暂时无法打开 | 断续边框与短线，14 秒交错呼吸 |
| 暂无远端备份 | 分层云弧，12 秒由内向外微亮 |
| 正在读取 AI 设置 | 读取横线，4 秒分组依次微亮 |
| 尚未选择模型 | 错位卡片边框，14 秒错峰轻呼吸 |
| AI 暂不可用 | 两侧疏密散点，14 秒错峰微亮 |
| 正在打开Thinkly | 四行读取阵列，4 秒依次微亮 |
| 暂无隐藏文件夹 | 视野弧线，12 秒扩散明暗变化 |

- 本轮最终检查：bun run typecheck、bunx vite build（5.97 秒）、git diff --check 通过；独立静态复核确认两处接入问题已闭合。不编写、不执行测试用例。静态源组件经离线 SVG 渲染后审图，不是 Electron 截图，也不代表宿主动效已实测。
- 旧图取自上一轮基线的静态 SVG；新图来自当前插画组件和背景组件。为便于比较展示在统一插画区域，背景在产品中的位置由实际容器决定，18px 图标的背景位于空状态行右侧。
- 离线渲染只替换了 cn 类名合并依赖，跳过与插画无关的 i18nYaml 初始化；没有模拟业务状态或宿主行为。
- 原来的“恢复速记”和“AI 助手已关闭”均保留现有图形与背景；未新增或改写任何语言文案、交互、事件、设置或持久化。
- 独立静态审查发现并修复两处接入问题：正常 full 启动原本没有渲染 loading 分支，本次在等待初始化时显示已批准的启动插画；大纲背景通过 showBackdrop 限制在可读取笔记的无标题状态，未选笔记、文件夹、不可用与载入中不增加新背景。搜索窗口的启动路径不变。
