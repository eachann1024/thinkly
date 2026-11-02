# 更新日志

## 1.7.345

- 允许 Windows 进程树关闭后的子进程正常退出
- 统一 LF 换行，修复发布时 Windows 产物文档冲突
- 用 Release 列表查找草稿，修复发布步骤 404
- release: 精简 Release 附件，新增 Windows arm64，去掉 rpm
- release: 预置 SignPath Windows 签名，补齐代码签名政策与隐私政策
- 笔记本选中行字号缩小一档
- 修复侧栏拖拽预览与误触
- 选中笔记的占位标题缩小一档
- 恢复侧栏按住拖动
- 开发模式显示版本号并缩小选中占位标题
- 修复主树拖拽预览被源行遮挡
- 选中笔记标题实际缩小一档
- 撤回主树拖拽浮层
- 修正打包入口的类型检查失败
- 搜索面板去掉标题关闭按钮，空输入不显示清空
- 接入 PR-Agent 审核与无致命问题自动合并 (#25)
- 海蓝配色排到主题列表第一项并作为默认
- copy: 统一术语「记事本」为「笔记本」
- copy: 统一术语「记事本」为「笔记本」 (#27)
- copy: 统一术语「系统回收站」为「系统废纸篓」
- copy: 统一术语「系统回收站」为「系统废纸篓」 (#28)
- copy: 统一术语「所有笔记本」与「历史记录」
- copy: 统一术语「所有笔记本」与「历史记录」 (#29)
- 去掉关闭弹层和隐藏菜单的控制台警告
- 审核只限仓库主人的 PR，精简机器人评论 (#30)
- copy: 统一中文标点、省略号与路径分隔
- copy: 统一中文标点、省略号与路径分隔 (#31)
- copy: 去掉引导和功能介绍里的营销腔
- copy: 去掉引导和功能介绍里的营销腔 (#32)
- copy: 精简设置项说明
- copy: 精简设置项说明 (#33)
- copy: 改写报错与空状态提示
- copy: 改写报错与空状态提示 (#34)
- copy: 改写英文失败提示
- copy: 改写英文失败提示 (#35)
- 叶脉、浅秋、麦笺移到配色最后一排并标 Pro
- 移除开发模式入口，统一用正式编译包验收
- 设置内容区不足时提前切换单列布局
- 用滑条调整界面缩放并同步侧栏大小
- 优化深色配色，统一中性灰表面与选中状态
- 设置侧栏默认最小宽度并独立保存调整
- 修复重命名及行内输入聚焦时的背景色块
- AI 内容和输入字号跟随编辑正文
- 界面缩放拖动时保持设置布局与滑条位置稳定
- 统一 Markdown 空块退格退出行为
- 修复 AI 变更预览拖选与选区高亮
- 优化 AI 处理中的主题色状态标签
- polish: 优化设置面板文案并去除“系统”前缀冗余
- 修复设置面板初始化时的变量重名错误
- 统一 AI 全流程状态标签与结果提示
- 改用字体下拉选择并改善间距与预览
- 为 macOS 顶栏与导航外壳恢复微透明材质
- polish: 优化全仓界面提示、异常反馈与微文案
- polish: 深入校对设置面板文案并彻底清除系统前缀冗余
- 统一设置页面标题与顶部布局
- 按职责拆分全局与工作区样式
- 拆分界面原语和页面导航组件
- 拆分编辑器生命周期与交互扩展
- 拆分代码视频图片与格式工具栏
- 拆分编辑器 AI 输入与引用逻辑
- 拆分存储同步与 AI 批处理工具
- 拆分文档导出和导入职责
- 拆分状态存储并清理失效动作
- 拆分工作区侧栏设置与速记流程
- 拆分桌面宿主窗口 IPC 和快捷键
- 拆分现役图表主题与选项处理
- 拆分笔记本 AI 会话与消息组件
- 拆分跨平台构建管理脚本
- 清理废弃 Agent 渲染链和闲置依赖
- 移除旧侧栏与旧搜索面板
- 删除未接线的旧实现与空兼容入口
- 撤除测试预览链并整理启动构建配置
- 明确静态检查边界并保留原始错误原因
- 支持字体键盘试用与确认取消
- 清除无引用私有函数和导入绑定
- 完善 AI 方案审批与变更预览
- 优化字体设置：统一使用左侧文章即时预览
- polish: 优化本地文件夹设置描述并移除右键菜单系统前缀
- 优化字体选择：读取系统字体并简化名称显示
- 优化字体菜单：按可见范围渲染长列表
- 为文档大纲显示标题级别标识
- 修复设置侧栏收起按钮的选中状态
- 增强 AI 输入条背景与发送按钮对比度
- 实现常驻导航与悬停侧栏，消除开关抖动和接缝
- 优化 AI 不可用时的极简空态与设置入口
- 复用笔记正文与结构摘要的有界派生结果
- 复用历史版本解析与签名并接通只读媒体预览
- 避免搜索分页与侧栏滚动重复计算全文结果
- 按文件指纹复用 Markdown 解析并合并即时读取
- 复用未变的 AI 历史消息投影
- 统一设置页双栏内容宽度
- 按内容版本复用本地技能目录并保持固定刷新期限
- 合并图片加载并按播放器生命周期释放视频资源
- 按主题与字体复用 Mermaid 渲染并隔离图形标识
- 在单次图片导出内合并重复资源解析
- 适配窄窗设置分类并保留返回时的导航状态
- 缓存字体探测并允许过期刷新与加载失败重试
- 短期复用宿主应用枚举与图标结果
- 完善 Git 同步冲突处理、目录重绑与故障恢复
- 精简 Git 同步设置并明确选中、异常与隐私状态
- 窄窗 AI 使用正文区域并在切换笔记后返回编辑
- 补齐收起侧栏后的历史版本入口与选择收起行为
- 补齐 Git 同步复选框的公共导出
- 优化搜索连续输入与长文高亮，避免重复全文扫描和渲染
- 对齐窗口配色层次与无描边布局
- 精简 Git 同步状态和操作展示
- 恢复正常宽度并排侧栏，仅在窄窗启用浮层交互
- 限制工作区外层滚动并防止 AI 聚焦移动整窗
- 统一明暗主题解析与独立窗口外观同步
- 集中公共控件尺寸圆角与交互状态
- 将工作区与编辑器控件接入公共入口
- 增加控件扫描台账与新增旁路检查
- 减少 AI 输入量高并移除反复拉伸的高度动画
- 统一输入和正文光标为稍加粗的主题强调色
- 将全局输入框及 AI 输入占位文字缩小一档
- 恢复默认多行输入并移除换排动画与逐键量高
- 缓存全局光标样式与裁剪信息以减少逐字布局开销
- 限制正文选区缓存只在正文聚焦时更新
- 即时同步输入空态并精简标签删除探测
- 将设置侧栏最小宽度减半并收紧菜单间距
- copy: 本地文件删除说明改为系统废纸篓
- 将内容侧栏默认与最小宽度减至 134 像素
- 统一内容和设置侧栏的最小及默认宽度为 200 像素
- 减少 Mermaid SVG 引用重写的重复扫描
- 按可视区域延后 Mermaid 预览渲染
- 清理图片说明中的自动生成文件名
- 修复图片加载破图闪现并支持失败重试
- 采用紧凑 Git 设置布局并移除隐私检查与连接说明
- 避免纯文本代码自动识别并复用选区高亮缓存
- 延后离屏公式渲染并缓存重复预览
- 将侧栏最小及默认宽度调整为 160 像素
- 修复 AI 输入框空白时光标高度过大
- 修正 Git 文件夹异常卡片与焦点提示
- 对齐 Git 同步设置标题与展开内容
- 将侧栏缺省态统一为轻量行
- 精简空白工作区的提示与操作
- 将媒体添加与加载失败占位改为轻量行
- 将空公式提示改为简短中文
- 精简正文输入占位提示
- 精简 AI 新会话与不可用缺省态
- 简化 AI 处理与图像生成占位
- 精简历史版本缺省态
- 精简启动与恢复占位
- 统一局部显示异常的提示与重试
- 缩小 Git 文件夹卡片的默认高度
- 将公式渲染移至 Worker 并分帧更新预览
- 修复含 HTML 换行标签的图表 SVG 解析
- 将图表预览移至独立进程并缓存渲染结果
- 统一 Git 同步设置的轻量交互样式
- 将默认编译安装 App 纳入项目验收标准
- 修复 Windows ARM64 安装包的架构检查
- 切回笔记时复用未变化的编辑器文档
- 切回缓存图表时直接恢复预览和占位高度
- 打开时才创建全屏预览以减少切页样式计算
- 将同步文件夹问题收进右侧提示
- 统一同步问题提示的字体和按钮尺寸
- 简化验收规则为按改动检查
- 移除同步问题提示中的文件位置展开项
- 为缺省页加入白鹅插画并整理操作层级
- 为侧栏底部入口显示固定记事本与设置文字
- 界面缩放时保持图标尺寸固定
- 修复侧栏搜索框聚焦时的多余方框
- 优化 AI 输入条高度与字号缩放
- 优化全局输入与正文光标上下间距及行内容垂直留白
- 重设计侧栏搜索并支持 Tab 切换范围
- 未关联文件夹时隐藏新标签与 AI 入口
- 修复行块点击与失焦抖动，优化光标与占位文字垂直居中
- 搜索结果排除未完整命中的分词候选
- 优化大纲空态提示在面板空白处居中
- 大纲标题固定显示文档大纲
- 移除欢迎标签常驻关闭按钮
- 让单行图标与文字共用垂直中线
- 大纲标题对齐搜索侧栏
- 本地标题对齐搜索侧栏
- 修正本地标题与搜索标题的对齐
- 移除空状态的 AI 与搜索入口
- 去掉空搜索打开时的状态闪烁
- 移除未参与产品构建的文案评审原型
- 统一 Windows 自动导入入口路径并升级补丁版本
- 修复同步文件夹失效恢复与笔记本重建后的关联更新
- 在笔记备份提交中说明正文资源和历史变更
- 使用本地同名目录备份并迁移旧远端映射
- 按笔记路径备份历史并保留误删与历史资源
- 移动笔记及恢复历史时保持静态资源引用有效
- 将笔记和静态资源删除恢复记录纳入隐藏备份
- 支持跨设备重新关联同名备份目录
- 增量恢复笔记时接回隐藏历史标识
- 移动目录时同步维护内外笔记资源引用
- 同步备份重构后的自动生成类型声明
- 按用途记忆原生文件选择目录并完善取消处理
- 清理同步文件工具末尾空行
- 给首次历史整理足够时间并显示安全的准备失败原因
- 重新生成同步准备模块类型声明
- 迁移目录时保留重新关联的防误删状态
- 重新打开笔记本后仍能读取同路径的全部历史版本
- 恢复旧历史时接回笔记本根目录的原有资源
- 修复失效图片重试时占位高度变化导致的抖动
- 清理未使用文件与重复打包配置
- 统一主题强调色与精准选中轮廓
- 保持单文档名称栏中性并稳定改名排版
- 兼容中文同步目录并修复配置读取失败后的重试
- 修复 Git 同步配置读取重试并统一目录比较
- complete accent coverage across controls and feedback
- complete accent coverage across controls and feedback
- stabilize single document title glyph baseline
- apply precise accent selection to menus and popovers
- stop search result selection from fading on switch
- Update README.md
- Refactor agent instructions into concise document rules.
- align page search toolbar controls and remove input border
- tidy code language picker layout and scrolling
- remove global search keyboard hint footer
- remove sidebar rename input frame
- remove formatter trailing newline from code blocks
- use Cmd+W to close tabs and stabilize tab titles
- seed global search from selected note text
- unify inline input geometry and text carets
- move sidebar files between notebooks and center menus
- prioritize search hit navigation and remove reader focus ring
- clear query immediately on first press
- publish verified desktop updates through GitHub CLI
- move notebook switcher to panel footer
- allow checking again after update download failure
- verify draft release tags through exact Git refs
- compact notebook switcher footer
- add release notes and confirmed background updates
- align update dialog actions with update state
- 将文件夹切换器融入侧栏底部层级
- show update controls only for newer releases
- 多分屏留白并统一界面字体
- 仅在文件视图显示笔记本切换器
- 段落里移动时块把手不再闪烁
- select note name when entering sidebar rename
- require names before creating notes and simplify tab menus
- register only the installed app in Open With
- remove unpacked build copies after installation
- create named notes inline in the sidebar
- keep the single-tab title bar neutral after closing
- add four paired sidebar icon previews
- adopt selected book-page icon set
- switch to swiss minimal icon set 04
- rename project to goose-note and simplify commands
- match icon set 04 reference geometry
- keep workspace navigation responsive
- show accent borders and tinted match backgrounds
- remove note tabs from workspace headers
- integrate table selection and compact AI composer
- restore notebook icon settings and center search controls
- remove redundant notebook settings labels
- hide titlebar actions on empty workspace
- improve dark inline rename selection contrast
- share editor plugin state and page-scoped interactions
- show file title with path actions
- create sibling files after editing split drafts
- align block editing and remove legacy plugin support
- preserve intentional document clearing
- remove editor block action menu and duplication
- align empty AI composer caret with its first line
- improve light inline rename selection contrast
- open new tabs as unsaved editor drafts
- align caret with trailing empty code lines
- wrap AI composer placeholder text
- keep disabled titlebar navigation transparent
- stabilize image export preview options
- align standard page width with Notion
- keep AI composer references fully manual
- limit file title interactions to the icon
- improve shared tooltip line spacing
- support workspace content drops and clear stale draft selection
- focus body below trailing tables and code blocks
- restore workspace tabs in the existing title bar
- use top controls for image export options
- keep image export controls stable when opening footer options
- unify shared menu rows and hide narrow sidebar toggle
- complete equal-width workspace tab interactions
- align inline AI caret and focus prompt on open
- adapt standard page gutters to narrow panes
- remove AI workspace drops and widen side split zones
- tighten global menu corners and improve spacing
- keep inline AI outline inside editor clipping bounds
- limit dragged notes to edge splits without floating tags
- simplify sidebar navigation across window widths
- refine notebook switcher layout and fade long names
- keep selection formatting controls visible
- remove selection count and extra toolbar actions
- show chat icon and hide selection shortcut hint
- tighten formatting toolbar and expose shortcut tooltips
- enlarge shortcut labels and separate key tokens
- keep caret below overlays and align notebook row sizing
- expand writing surfaces and setup dialog
- stop editor drags from opening splits and remove block handles
- reclaim hidden notebook action space and share menu rows
- preserve local agent instruction changes outside menu fix
- align menu bottom spacing with top inset
- restore editor block move handles
- tighten model selector menu width
- align table merge controls with formatting toolbar
- restore October 13 editor handle component
- match table menus to application menu style
- synchronize desktop titlebar typography
- unify overlay ownership and stacking order
- preserve running state when building and installing
- simplify quick note window chrome and slot emphasis
- simplify quick note settings and add font size slider
- align desktop titlebar typography and icon proportions
- unify all application menu styles
- refine quick note slot hover selection and hold cursor
- adopt system serif and bundle JetBrains Mono
- give delete receipts an opaque surface and keep single tabs neutral
- toggle asset selection when clicking resource content
- apply compact A menu spacing
- fit quick note rename target to title text
- remove tab pinning
- align compact window panels and dialogs with editor
- align tables with text and float table controls
- allow missing bundled changelog
- reuse sidebar width and resizing in compact windows
- reclaim compact macOS titlebar spacing
- align task checkboxes with the first text line
- add Claude theme preset
- hide markdown extension in page titles
- redesign Claude theme with flat warm surfaces
- add editor grid modes and tinted sidebar option
- keep sidebar surfaces controlled by theme
- simplify theme choices and allow natural wrapping
- keep editor grid off the canvas edges
- keep table handles outside content and visible without sidebar
- preserve contained paste structure and markdown hierarchy
- restore tinted sidebar option
- align data export choices and reset card with design rules
- remove colored sidebar feature
- compact notebook switcher header height
- show upright placeholders only at focused caret
- align current navigation focus and selection outlines
- create notes as 新页面 and edit titles in the document
- add three window pin icon previews
- remove notebook switcher hover tooltip
- optional folder item count badges
- inset editor grid lines from canvas edges
- give tables an opaque theme background
- move window pinning into stacked-window icon
- show document title for draft pages from every create entry
- reduce table drag selection work per frame
- replace sidebar search with bottom sheet panel
- align quick-note bullets and scroll dock toolbar horizontally
- app-level search sheet with inline AI answers
- restrict results to registered notebook folders
- separate open folder action into dedicated group in notebook switcher
- bundled local semantic retrieval for search answers
- package with the installed Electron version
- replace local semantic retrieval with model query rewriting
- use the contributed Electron version lookup
- 首次完成引导后全屏播放吉卜力风欢迎短片 (#42)
- 整理工作区改动并清理设计产物
- 添加片头动画重播按钮
- 以显式事件和可辨识联合统一流程状态
- 调整首次欢迎动画时序窗口与配乐
- customize macOS DMG artwork and install helper
- restrict slash triggers and remove focus outlines
- 强化 AI 回答操作栏并加入面板入场动效与纹理
- apply certificate-free ad-hoc signing to macOS bundles
- 去除底栏分隔线并为各状态补齐入场动效
- AI 未启用时改为纯搜索并在无结果状态引导启用 AI 问答
- unify macOS installation guidance across distribution
- avoid reopening mention menu when moving blocks
- clean up DMG layout and clarify authorization step
- refine installer copy with Gemini review
- add system-aware Chinese and English interface
- gate settings behind activation and available local context
- make switch option rows fully clickable
- rename local notebook folders without losing path mappings
- add weekly AI reflection with sidebar badge
- track failures per week and trim recomputation
- add theme-specific decorations to share image cards
- rebuild on version history with range switch and richer insights
- store .goose history per pageId with migration and tombstone cleanup
- fit dialog to viewport with scrolling body and proportional width
- apply language changes live with shared settings controls
- align reflection calendar icon and selected state
- simplify history titlebar to back, title and restore
- keep toolbar height fixed in column layout
- resolve local DMG background with short volume name
- adopt Claude-like typography with Inter, lighter weights and warm neutrals
- extend toolbar background to window edge
- show hoverable trend nodes and use shared dropdown for range
- structure AI reflection into themes and suggestion
- regenerate declarations during production builds
- include complete Finder icon view metadata
- show 鹅的笔记 in the Chinese interface
- typeset sharp Retina installer backgrounds
- simplify installer art and brand authorization icon
- write summaries in plain second person and restore trend tooltip
- normalize Windows compiler source paths
- validate release notes before building installers
- 停用未配置的 OSS 国内同步
- add portrait global search and AI intro
- clarify search hits and AI entry
- 发布后把安装包上传到夸克网盘
- render serif mode with subpixel smoothing
- hold each shot two seconds longer
- 夸克分片从第 2 片起附带增量 SHA1 上下文 (#46)
- 版本未变时跳过构建和夸克上传 (#47)
- save sheet AI answers as history and resume them in the AI panel
- 同版本发布只跑判断并跳过后续构建 (#48)
- 工具条按组呈现分段托盘，字体选择改为整宽分段控件
- 夸克上传按文件编号重命名并清理残留 (#49)
- 正文宽度改为分段托盘并移到字体下方
- 补齐速记帮助文案类型并标注 i18n 刷新队列 (#50)
- 正文宽度只保留标准与全宽，默认项标注（默认）
- 浮动格式条保持单行，避免缩放小数宽度误触换行
- 打开文件夹改为底部强调色“添加笔记本”按钮，避免误认作笔记本
- AI 入口按真实可见状态高亮，图标栏支持拖动排序
- 统一对话框工具栏，跨笔记本检索，修复光标跟随
- AI 入口随真实布局模式显示，侧屏模式不再在图标栏重复出现
- 侧屏 AI 模式恢复标题栏 AI 按钮，全屏模式入口留在图标栏
- 上传新版成功后只保留最新版 (#52)
- Cmd+1~4 按图标栏顺序映射入口，AI 项切换 AI 面板，标签切换改为 Cmd+5~9
- 界面产品名改为思绪 · Thinkly (#55)
- 应用外壳和文档改为思绪 · Thinkly (#58)
- 收尾引导片、安装背景脚本和 Homebrew 显示名里的旧产品名 (#59)
- 逐项复制字体属性，修复 textarea 光标在标题等大字号处偏小
- 修复引用块留白与子行输入对齐
- 修正更新提示中产品名后的间距
- 构建脚本和自动导入声明改用思绪 · Thinkly
- 同步引擎的提交作者名改为 Thinkly
- 折叠块光标按标题行居中
- 下线折叠列表，大于号改为引用
- 新增日语界面
- 分享图片、Word、PDF、粘贴与 AI 摘要跟进分栏块
- AI 会话提交统一用 Eachann 身份并去掉 AI 署名
- 自带联网、过程时间线与 20 种交互式卡片
- 加载时显示骨架屏
- 把验收脚本纳入仓库
- connect document title and body keyboard navigation
- remove filter interaction animation delays
- 全局搜索快捷键弹出独立搜索浮窗
- 统一使用原生光标消除输入位置偏移
- 统一通知组件与图标/文字/关闭按钮对齐
- 修正折叠标题占位与光标边界，补光标调试画廊
- 操作按钮与文案同排靠右，通知不再被撑高
- 补齐逐块光标浏览器验收
- integrate subtle looping empty-state illustrations
- 全局搜索补齐 AI 问答，并与软件内搜索对齐
- 构建与安装输出改为单行结果，裁掉多余字体与分块
- 页面图标改用内置图标集，去掉 lucide 回退
- 删除、关闭与移动只淡出真正消失的项
- 长文档与大表只处理可见范围
- 首启选择点阵形象，设置里可随时更换
- 设置项统一行高，面板关掉即卸载
- Git 同步改为可选模块
- 欢迎短片固定 16:9 窗口，可静音
- 搜索会话收敛成一份状态机
- 会话运行时按需加载，面板与聊天状态解耦
- 重新生成消息类型索引
- 搜索框与 AI 输入对齐，支持换行、贴图、@ 和 Skill
- 搜索输入补上页面上下文，点 @ 打开对应笔记
- GitHub 仓库改名为 thinkly
- 选区图片改用页面标题，并把保存文件名收到各系统上限内
- 主题弹层按开头一屏即时出预览，笔记本去掉点阵
- 按落点导入文件并支持音视频播放与临时三倍速
- 修复图片和视频粘贴的嵌套事务冲突
- 补强粘贴块属性与子结构验收
- 新增六大能力横屏介绍片 Remotion 工程
- 把应用身份和本地数据改到 Thinkly
- 撤回 #62 中与 Thinkly 应用身份改动冲突的部分 (#63)
- 用强调色标出当前分屏，并在标题栏切换同级笔记
- 介绍片人物换成项目形象卷卷，网点统一 4px 调幅半调
- 侧栏笔记可拖进编辑区边缘开分屏或中央替换
- 分屏标题栏增加更多菜单和临时放大
- 侧栏拖拽落点线改成拖宽把手的淡出线
- 正文开头退格时把光标送回标题末尾
- 方向键在相邻格间换焦、交换，并套用布局预设
- 功能介绍片按真实界面重做：主窗口、侧栏、AI 栏、速记窗、分屏、分享图与历史均照现有布局，内容用骨架屏填充
- 同一笔记的分屏可以按滚动比例同步
- 分屏滚动同步与设置面板反馈，视频工程移出代码库
- 更多菜单接上同步滚动和布局，放大收成一套
- 修正设置布局样式的相对导入路径 (#67)
- mac 构建安装改为认 Thinkly.app (#68)
- 视频工程移出代码库
- 首屏减重 1.8MB，首帧稳定从 1139ms 降到 787ms
- 记录窗口真正显示的时机
- 空行退格回标题末尾，空标题回车变回段落
- 修复清除格式，并把分屏焦点快捷键收进进阶用法
- 悬停表格行时显示行把手
- 标题回车按光标拆入正文并联动撤销
- 应用全新六种缺省状态插画
- connect title arrows and safely merge body on backspace
- 降低点阵动效与开发生成器 CPU 开销
- slow feedback sheen and use single attachments
- 反馈输入补上占位，扫光提前 1 秒
- 设置页把窗口按钮放回顶栏右侧
- 修复 => 鼠标移向表格把手时不再消失
- 创建 => 表格序号改为菜单里可选的自动追加编号
- 同版本有用户向提交时自动 patch 升版发桌面包 (#76)
- 修复表格自动编号带来的 typecheck 错误 (#75)
- 写回 package/CHANGELOG 基于 main tip 合并 (#77)
- 速记说明弹层改为两行有序列表
- 修复 Windows 全局快捷键不生效
- 悬停页签名称时才显示拖拽把手
- 去掉笔记页右上角的路径标签
- 页签名称和拖拽把手都放在正中
- 侧栏右键菜单按内容撑开宽度
- 修复新建空笔记立刻删除时只提示未完成
- 修复 thinkly 标记的富表格重新打开时变成 raw-block
- 通知长文案：无空格长串可断行，多行最多 4 行
- 去掉表格多行选中时叠在锚点格上的内框
- Require Node.js 22 (#87)
- 侧栏更新入口改用同套导航图标
- 类型检查改用 tsrs，不支持时回退 tsc (#85)
- 修复 macOS 全局搜索把主窗口一起带出来
- Remove the welcome animation and open the character picker first
- List character-guide in the verification scripts
- drop the hide hold when focusing an existing workspace
- Retry Quark uploads on transient network failures (#84)
- keep macOS update install from failing on app.asar (#88)
- 让搜索窗跟上工作区 AI，并补上剪贴板读图和跨行匹配。
- keep block-handle drags from opening a split (#92)
- 放大分屏拖放时的落区提示标签 (#93)
- 编辑区左侧留白始终放得下块把手，不再压到侧栏
- 编辑器末尾空白显示加号，悬停或点击在文末打开块菜单
- 块把手换块时滑动过去，离开块稍等再隐藏
- 侧栏拖拽落点线跟随当前强调色。
- switch back to note in one click from fullscreen AI rail (#95)
- accept search-window AI snapshot and continue-ai handoff (#96)
- schedule weekly monthly and quarterly reports
- Name the quick note window after the notebook (#98)
- Retry macOS DMG builds when hdiutil detach is busy (#97)
- Center the AI panel selection quote icon, label, and close control (#99)
- stop repeating an installed macOS update
- List ai-quote-align in the verification scripts (#100)
- shrink the AI panel while the sidebar is dragged (#102)
- Save notes as ordinary Markdown
- prevent pasted text from opening suggestion menus
- enable horizontal wheel scrolling in floating formatting toolbar
- add centered icons to AI review toolbar
- compact AI processing status without background
- update table layout live while dragging resize handles
- reorder table rows and columns while dragging handles
- keep blank-line clicks on the selected visual line
- parse inline links inside rich tables (#106)
- align floating search acceptance with the current raise path (#107)
- bind AI writes to frozen notebook resource scopes
- 隔离设置分类页面与笔记编辑器浮层
- keep workspace drag previews live and lightweight
- animate sidebar width only when expanding or collapsing
- toggle history milestones without confirmation
- split history headers across the sidebar and document
- Refactor → strip explanatory comments
- Fix → use lowercase thinkly app name
- Fix → open associated markdown files
- Fix → keep standalone files out of notebooks
- Add → block handle menu and drag
- Improve → wire block handle toolbars
- Add → column drop while dragging blocks
- Improve → replace and delete media blocks
- Improve → restyle media block shells
- Fix → slash insert and block conversion
- Fix → verify block type conversion
- Fix → count reflection over recent days
- Add → resizable textarea grip handle
- Improve → search page references faster
- Fix → record and list note history
- Fix → keep find bar inside the editor
- Add → fade overflowing assistant text
- Docs → keep design notes and menu evals
- Improve → remaining editor and workspace behavior
- delete headings and open the slash menu at block start (#114)
- skip the settings flush when the note body is unchanged (#113)
- Config → Remove persistent verification
- Fix → Keep switch thumb visible on hover
- Improve → Put standard page layout first
- Fix → Remove notebook menu row gaps
- Fix → Fill sidebar rows without gaps
- Fix → Require a brief hold for note dragging
- Fix → Remove default Electron app from macOS
- Fix → Bundle YAML for Electron workers
- Improve → Load Markdown exports on demand
- Fix → Resolve physical roots in allowlists
- Fix → Place cursor after typed dividers
- Fix → Keep table handles on the first cell
- Improve → Use one page mention trigger
- Fix → Keep created page reachable after edits
- Add → Atomic filesystem compare and swap
- Fix → Apply selected colors consistently
- Improve → Defer Mermaid preview loading
- Fix → Keep exported diagram labels readable
- Add → Store note metadata outside Markdown
- Fix → Restore note identity during folder scans
- Fix → Watch note metadata without losing edits
- Fix → Preserve metadata when moving notes
- Fix → Preserve notebook portable identities
- Fix → Flush notebook deletion state immediately
- Fix → Save Markdown with protected metadata
- Fix → Keep newer edits dirty during saves
- Fix → Preserve drafts when creation fails
- Fix → Allow manual update checks again
- Fix → Keep only one root menu open
- Fix → Keep editor popovers open during edits
- Fix → Keep tooltips visible inside dialogs
- Improve → Use a stable menu exit animation
- Fix → Match notification actions to intent
- Add → Retry failed saves from notifications
- Add → Browse and export recovery drafts
- Fix → Recover note settings with content
- Fix → Retry page persistence failures
- Fix → Include note settings in history
- Fix → Protect edits during history restore
- Fix → Preserve history during notebook moves
- Fix → Open split context menus consistently
- Improve → Restore cached editor undo state
- Add → Open the target of desktop notifications
- Add → Apply Git conflict choices together
- Improve → Run Git sync in background jobs
- Fix → Validate Git notebook folder recovery
- Fix → Merge note metadata as one Git unit
- Improve → Align Git sync interval input
- Fix → Ignore hidden metadata in folder imports
- Add → Back up complete local notebooks
- Add → Restore local backups into empty folders
- Add → Include local notebooks in cloud backups
- Add → Open recovery drafts from settings
- Fix → Report nested note metadata failures
- Fix → Open settings from actionable errors
- Fix → Focus windows from web notifications
- Fix → Apply notebook deletion without delays
- Improve → Simplify selected notebook rows
- Improve → Load code preview tools on demand
- Improve → Place code language after actions
- Fix → Avoid invalid local image URLs
- Improve → Keep sidebar scroll padding inside
- Fix → Restore draft presentation settings
- Fix → Export Markdown without app metadata
- Fix → Preserve portable notebook markers
- Fix → Preserve metadata while rebasing links
- Fix → Isolate notebook tab activation
- Fix → Ignore superseded single tab switches
- Fix → Retry saves after closing a note
- Fix → Preserve quick notes edited during save
- Fix → Make quick note failures actionable
- Improve → Open recovered quick note drafts
- Config → Clarify temporary check cleanup
- Refactor → Flatten legacy column content
- Refactor → Unfold legacy heading content
- Refactor → Remove column editing controls
- Refactor → Remove heading folding controls
- Fix → Migrate retired block containers
- Fix → Hydrate unfolded legacy note content
- Improve → Open recovered editor drafts
- Fix → Hide block cursor for external files
- Refactor → Drop obsolete toggle shortcuts
- Fix → Delete selected divider blocks
- Fix → Exit empty nested lists consistently
- Fix → Resolve nested block backspace parents
- Fix → Position slash insertion cursors
- Improve → Preserve image sizes during drags
- Refactor → Remove image caption editing
- Fix → Preserve lightbox window controls
- Fix → Flatten legacy blocks in document exports
- Fix → Preserve YAML structure in note metadata
- Refactor → Drop legacy column note metadata
- Fix → Read legacy containers as plain blocks
- Fix → Parse multiline rich text spans
- Fix → Flatten legacy Markdown serialization
- Improve → Omit redundant Markdown styles
- Improve → Keep block selection decorations sparse
- Fix → Apply shared block color behavior
- Refactor → Remove folded section menu actions
- Improve → Simplify block handle clipboard menu
- Improve → Convert selected blocks together
- Improve → Anchor block menus to editor panes
- Improve → Stabilize block toolbar hover
- Fix → Align block handles with the first line
- Fix → Keep the trailing add menu stable
- Improve → Fit suggestion menus within the window
- Improve → Simplify slash menu commands
- Improve → Remove redundant editor placeholders
- Improve → Remove active line background
- Improve → Align table block spacing
- Fix → Activate newly created notebooks safely
- Fix → Clear the editor on welcome tabs
- Fix → Scope tab closing to the active notebook
- Types → Refresh editor and message declarations
- Fix → Keep deletion navigation in its notebook
- Clear notebook search and welcome selection state
- add .metadata-eval.mjs
- add 5 files in src/
- update gitNoteMetadata.ts
- update 24 files in src/
- Fix metadata identity retries and file operation isolation
- Preserve open page identities when metadata is first saved
- update gitNoteMetadata.ts
- update 4 files in src/
- Keep Markdown unchanged for block metadata updates
- Animate AI page edits and undo with localized skeletons
- Fix → preserve desktop file type information
- Add → open local links from the editor
- Add → jump to headings after opening notes
- ignore note save shortcut while settings are open
- show AI configuration errors only for explicit requests
- Fix cross-notebook note identity collisions and preserve history
- Remove AI composer resource picker
- Preserve editor content and keep AI write skeletons visible
- Fix streaming response card surfaces and duplicate note headings
- Anchor AI write skeletons to document content while scrolling
- Fix scrolling in history version previews
- Apply quiet inline design to AI review action states
- remove border from conversation delete icons
- show skill loading steps only with specific capabilities
- preserve accurate AI response completion states
- preserve active states for open popup triggers
- expand progress backgrounds with sequential steps
- Fix sidebar page drag preview
- smooth first search opening and restore global search focus
- close the tab or AI panel based on active surface
- bound execution progress rendering and derive summaries lazily
- skip missing electronDist on CI macOS builds (#115)
- complete AI execution details and artifact action feedback
- correct electronDist comment for Electron 44 (#116)
- apply approved button design across the application
- prewarm workspace surfaces during idle startup
- exclude imported content from reflection activity
- unify AI panel cards, composer, menus and feedback
- unify Thinkly branding across all languages and prepare 1.7.331
- capitalize Thinkly in localized application menus
- record reflection activity independently from history snapshots
- keep deletion transactions synchronous
- display YAML label for frontmatter blocks
- anchor typed slash menus to the caret
- Fix code language picker current selection and remove grouping
- Remove page and callout entries from slash menus
- keep slash menus anchored when flipping above
- Improve editor placeholder shortcut hint and align translations
- Keep concurrent quick note changes outside placeholder update
- Fix quick note activation and improve shortcut help
- move code block chrome into a floating island (#117)
- center the collapsed code legend glyph and give the expanded chip room (#118)
- Fix inline shortcut spacing and quick note help styling
- Fix heading text colors and reduce heading bottom spacing
- align add-button menus with slash menu placement
- Fix Enter and paste behavior for headings and list items
- reuse split pane menu selection and available name width
- switch submenus without exit animation delay
- Unify vertical spacing across heading levels and backgrounds
- restore and bundle Tsanger JinKai serif font
- remove code block folding and always show code
- select the document title when creating a file
- update 5 files in src/
- Fix quick note save names to match slot titles
- settle cancelled streams and present follow-up choices after responses
- Remove redundant AI change preview metadata
- Fix copied table handling and allow reapplying undone AI changes
- publish one installer per platform and a hidden update channel (#120)
- build blockmaps with electron-builder's JS builder and keep only the three installers on Quark (#122)
- always refresh Quark 说明.txt and allow forced Quark re-upload (#123)
- platform-labelled installer names on Quark (#124)
- use bundled LXGW WenKai as the default serif font
- preserve bundled JinKai for existing custom selections
- register a Windows-safe global search shortcut (#126)
- move close action into the desktop title bar
- recover interrupted sync through version choices
- add system dot-matrix outline illustration mockup
- simplify the outline empty-state dot illustration
- audit dot illustrations and add before-after proposals
- apply approved dot illustrations and animated backdrops
- add three looping variants for remaining empty states
- apply selected animated empty-state illustrations
- add three single-column settings layout concepts
- refine AI composer typography and spacing
- separate composer input from model controls
- clarify canvas groups and prevent board overlap
- allow cross-resource access and await file permissions
- add comments.json
- widen feedback form and align send button with attachments
- pin feedback navigation and remove sheen animations
- show blank themed background during cold start
- restore settings icon and fill appearance theme grid
- add three cold-start motion concepts
- add one-shot frame trace launch animation
- add framed launch motion concepts in light and dark
- replace launch trace with framed outline animation
- generate scheduled reflections while workspace is in background
- eliminate layout animation during folder toggles
- remove geometry reads from folder expansion
- defer inactive context menu anchor updates
- prevent unintended punctuation suggestions
- guard mention reconciliation after IME input
- remove unnecessary editor scroll space
- add font smoothing toggle
- unify placeholder typography with body text
- show font smoothing toggle only on macOS
- Remove text option from editor insertion menu
- add tab open/close motion canvas
- animate tab rail opening and closing
- show selection for dividers and hidden code previews
- switch to flat surfaces
- flat hover/open states and flat press feedback
- defer page swap baseline reconciliation
- narrow navigation store subscriptions
- activate pages in the same tick as tabs
- limit entry motion to sidebar and settings
- batch inline preview outline geometry
- persist Electron documents independently
- track page changes and tree metadata revisions
- stabilize notebook host navigation capabilities
- suspend hidden picker and scope AI context reads
- coalesce media toolbar anchor measurements
- isolate referenced page updates to memoized message rows
- reuse content derivations and batch activity writes
- retain recent tab views across Activity switches
- commit local dirty flags with page updates
- pause offscreen clocks and cache time formatters
- reuse tree items and stabilize tree callbacks
- cache frozen review conversions and narrow page subscriptions
- skip unrelated scans and isolate active heading updates
- map sized decorations and measure candidate tables
- contain expanded Git details in one surface
- defer fingerprints and subscribe outside React renders
- persist drafts separately and save conversations incrementally
- update catalog and index from scoped page changes
- stabilize session commands and pause hidden placeholder timers
- memoize result rows and stabilize row actions
- cache history budgets and persisted snapshots
- mount picker subscriptions inside the dialog
- limit live page reads to the notebook AI host
- synchronize refreshed image selection anchors
- isolate streamed session subscriptions and composer hints
- Settings → Remove recovery drafts entry from general settings
- remove project-level identity hooks and settings
- align sources row width and hide zero-second step durations
- cover the whole page with a curtain skeleton while AI writes apply
- draw block-shaped page skeleton and cover the full editor viewport
- hide page content and show a virtual skeleton while AI writes apply
- live execution timeline with stage lanes and output speed
- exclude the protected title block from block handle hover
- add 21 files in designs/
- add 6 files in src/
- update canvas.json
- update 31 files in src/
- use the resolved editor surface color for the write skeleton cover
- explore execution panel that explains every wait
- explain model waits in execution panel with tabbed sources
- use shared segmented control for source tabs
- explore review toolbar without divider and inline copy feedback
- explore three motion-rich AI panel directions with a one-line composer
- default review to final text with inline copy feedback

## 1.7.344

- generate scheduled reflections while workspace is in background
- eliminate layout animation during folder toggles
- remove geometry reads from folder expansion
- defer inactive context menu anchor updates
- prevent unintended punctuation suggestions
- guard mention reconciliation after IME input
- remove unnecessary editor scroll space

## 1.7.343

- widen feedback form and align send button with attachments
- pin feedback navigation and remove sheen animations
- show blank themed background during cold start
- restore settings icon and fill appearance theme grid
- add three cold-start motion concepts
- add one-shot frame trace launch animation
- add framed launch motion concepts in light and dark
- replace launch trace with framed outline animation

## 1.7.342

### 2026-11-01 · AI 助手

🌈 本次更新重点：AI 输入更清楚，跨笔记本处理内容和文件权限确认更顺畅。

🪐 优化
• AI 输入框字号更协调，提示文字与模型选择保持清晰间距。
• AI 可跨已连接的笔记本查找内容，并按要求处理笔记。

🐛 修复
• 访问本地文件时等待权限确认，确认后继续执行。

## 1.7.341

- add system dot-matrix outline illustration mockup
- simplify the outline empty-state dot illustration
- audit dot illustrations and add before-after proposals
- apply approved dot illustrations and animated backdrops
- add three looping variants for remaining empty states
- apply selected animated empty-state illustrations
- add three single-column settings layout concepts

## 1.7.340

- move close action into the desktop title bar
- recover interrupted sync through version choices

## 1.7.339

- always refresh Quark 说明.txt and allow forced Quark re-upload (#123)
- platform-labelled installer names on Quark (#124)
- use bundled LXGW WenKai as the default serif font
- preserve bundled JinKai for existing custom selections
- register a Windows-safe global search shortcut (#126)

## 1.7.338

- publish one installer per platform and a hidden update channel (#120)
- build blockmaps with electron-builder's JS builder and keep only the three installers on Quark (#122)

## 1.7.337

- Fix quick note save names to match slot titles
- settle cancelled streams and present follow-up choices after responses
- Remove redundant AI change preview metadata
- Fix copied table handling and allow reapplying undone AI changes

## 1.7.336

- select the document title when creating a file
- update 5 files in src/

## 1.7.335

- Fix heading text colors and reduce heading bottom spacing
- align add-button menus with slash menu placement
- Fix Enter and paste behavior for headings and list items
- reuse split pane menu selection and available name width
- switch submenus without exit animation delay
- Unify vertical spacing across heading levels and backgrounds
- restore and bundle Tsanger JinKai serif font
- remove code block folding and always show code

## 1.7.334

- Improve editor placeholder shortcut hint and align translations
- Keep concurrent quick note changes outside placeholder update
- Fix quick note activation and improve shortcut help
- move code block chrome into a floating island (#117)
- center the collapsed code legend glyph and give the expanded chip room (#118)
- Fix inline shortcut spacing and quick note help styling

## 1.7.333

- Fix code language picker current selection and remove grouping
- Remove page and callout entries from slash menus
- keep slash menus anchored when flipping above

## 1.7.332

### 2026-10-27 · 编辑与回顾

🌈 本次更新重点：删除内容和打开插入菜单更顺手，回顾统计更准确。

🪐 优化
• 文档头部的代码语言标签统一简化为 YAML。

🐛 修复
• 快速删除内容时，光标与画面保持同步。
• 输入斜杠打开菜单时，菜单跟随光标位置。
• 回顾统计独立记录实际编辑，不受历史版本清理影响。

## 1.7.331

- 所有语言统一使用 Thinkly 名称，同步更新启动页、系统通知、导出水印、安装界面与帮助说明。
- 修复 macOS ARM64 发布时因缺少 Electron 二进制导致的构建失败。
- 优化编辑器块操作、图片拖动尺寸保留与菜单布局，修复快速切换笔记时的卡顿。
- 改进笔记元数据迁移、Git 冲突批量处理与后台同步调度。
- 优化 AI 面板、按钮和主题反馈，并修复导入内容影响回顾统计的问题。

## 2026-10-26

### 笔记链接

🌈 本次更新重点：笔记里的本地文件和标题链接可以直接打开，点击与快捷键的操作更一致。

✨ 新功能
• 打开链接可跳转到当前或另一篇笔记的指定标题。
• 可从笔记链接打开本地文件、文件夹和 Markdown 笔记。

### 保存与编辑

🌈 本次更新重点：笔记保存和恢复更稳妥，编辑菜单与切换笔记更顺手。

✨ 新功能
• 设置里可查看、恢复和导出未完成保存的草稿。

🪐 优化
• 编辑菜单位置更稳定，拖动图片保留原有尺寸。
• 旧分栏与折叠内容自动展开，导出笔记更简洁。

🐛 修复
• 修复保存期间继续编辑、切换笔记本时的内容与标签错位。

## 1.7.330

- Refactor → strip explanatory comments
- Fix → use lowercase thinkly app name
- Fix → open associated markdown files
- Fix → keep standalone files out of notebooks
- Add → block handle menu and drag
- Improve → wire block handle toolbars
- Add → column drop while dragging blocks
- Improve → replace and delete media blocks
- Improve → restyle media block shells
- Fix → slash insert and block conversion
- Fix → verify block type conversion
- Fix → count reflection over recent days
- Add → resizable textarea grip handle
- Improve → search page references faster
- Fix → record and list note history
- Fix → keep find bar inside the editor
- Add → fade overflowing assistant text
- Docs → keep design notes and menu evals
- Improve → remaining editor and workspace behavior

## 1.7.329

- 隔离设置分类页面与笔记编辑器浮层
- keep workspace drag previews live and lightweight
- animate sidebar width only when expanding or collapsing
- toggle history milestones without confirmation
- split history headers across the sidebar and document

## 1.7.328

- schedule weekly monthly and quarterly reports
- Name the quick note window after the notebook (#98)
- Retry macOS DMG builds when hdiutil detach is busy (#97)
- Center the AI panel selection quote icon, label, and close control (#99)
- stop repeating an installed macOS update
- List ai-quote-align in the verification scripts (#100)
- shrink the AI panel while the sidebar is dragged (#102)
- Save notes as ordinary Markdown
- prevent pasted text from opening suggestion menus
- enable horizontal wheel scrolling in floating formatting toolbar
- add centered icons to AI review toolbar
- compact AI processing status without background
- update table layout live while dragging resize handles
- reorder table rows and columns while dragging handles
- keep blank-line clicks on the selected visual line
- parse inline links inside rich tables (#106)
- align floating search acceptance with the current raise path (#107)
- bind AI writes to frozen notebook resource scopes

## 1.7.327

- accept search-window AI snapshot and continue-ai handoff (#96)

## 1.7.326

- 去掉表格多行选中时叠在锚点格上的内框
- 修复 macOS 全局搜索把主窗口一起带出来
- Remove the welcome animation and open the character picker first
- List character-guide in the verification scripts
- drop the hide hold when focusing an existing workspace
- 让搜索窗跟上工作区 AI，并补上剪贴板读图和跨行匹配。
- keep block-handle drags from opening a split (#92)
- 放大分屏拖放时的落区提示标签 (#93)
- 编辑区左侧留白始终放得下块把手，不再压到侧栏
- 编辑器末尾空白显示加号，悬停或点击在文末打开块菜单
- 块把手换块时滑动过去，离开块稍等再隐藏
- 侧栏拖拽落点线跟随当前强调色。
- switch back to note in one click from fullscreen AI rail (#95)

## 1.7.325

- Retry Quark uploads on transient network failures (#84)
- keep macOS update install from failing on app.asar (#88)

## 1.7.324

- Require Node.js 22 (#87)
- 侧栏更新入口改用同套导航图标
- 类型检查改用 tsrs，不支持时回退 tsc (#85)

## 1.7.323

- 侧栏右键菜单按内容撑开宽度
- 修复新建空笔记立刻删除时只提示未完成
- 修复 thinkly 标记的富表格重新打开时变成 raw-block
- 通知长文案：无空格长串可断行，多行最多 4 行

## 1.7.322

- 反馈输入补上占位，扫光提前 1 秒
- 设置页把窗口按钮放回顶栏右侧

## 1.7.321

- 修复表格自动编号带来的 typecheck 错误 (#75)
- 写回 package/CHANGELOG 基于 main tip 合并 (#77)
- 速记说明弹层改为两行有序列表
- 修复 Windows 全局快捷键不生效
- 悬停页签名称时才显示拖拽把手
- 去掉笔记页右上角的路径标签
- 页签名称和拖拽把手都放在正中

## 1.7.320

- 同版本有用户向提交时自动 patch 升版发桌面包 (#76)

## 1.7.319

- 表格右键菜单和表格把手菜单新增「自动追加编号」，可随时开关行序号，导出 Markdown 时保留。
- 悬停表格行时显示行把手，鼠标移向把手途中不再消失。
- 标题与正文衔接更顺：标题里按回车会把光标后的文字拆进正文并可一步撤销，空标题回车变回普通段落；上下方向键在标题和正文间直接移动，正文开头退格会并回标题。
- 修复清除格式偶尔不生效；侧栏和编辑区空白处右键可把笔记开到右侧或下方分屏，分屏焦点切换等快捷键收进「进阶用法」。
- 搜索、AI 和分屏的空状态换上全新点阵插画。
- 启动更快：首屏资源减少约 1.8MB，窗口首帧稳定时间从约 1.1 秒降到约 0.8 秒；点阵动效占用的 CPU 更低。
- 设置里「反馈」入口的提示光效放慢，反馈表单改为附一张图片。

## 1.7.318

- 应用正式改名为 Thinkly（磁盘上是 Thinkly.app，安装包文件名 Thinkly-*）。1.7.317 及更早版本无法在应用内自动升级，需要到官网或 GitHub Release 手动下载安装一次；装好后可以删掉旧的 Goose Note.app。macOS 辅助功能等系统权限需要重新授权。首次启动会自动把原数据目录迁移过来，笔记和设置不受影响。Homebrew 用户执行 `brew update && brew upgrade` 会自动迁到 thinkly cask。
- 搜索框与 AI 输入对齐，可以换行、贴图片，并用 @ 引用笔记和 Skill；检索仍按笔记正文，点 @ 打开对应笔记。
- 本地笔记可以把文件拖到正文落下的位置导入，并播放音频和视频；视频可以调速，按住右键临时三倍速。修复粘贴图片和视频时插入失败的问题。
- 分享选区图片改用页面标题，保存和重命名的文件名收到各系统上限内；主题预览只排版开头一屏并即时显示，不再等待网络字体，笔记本主题去掉点阵。
- 分屏用强调色标出当前这一格，未选中的不再描边；标题栏可以切换同级笔记，选中后只替换这一格并聚焦，文件夹不能放进分屏。

## 1.7.317

- 首次打开先选一只点阵形象，侧栏设置入口显示所选形象的头像，设置「外观」里可随时更换。
- Git 同步改为可选模块：设置里可开关，没装 git 时不显示 Git 页签，关闭后不再后台同步。
- 长文档与大表格更跟手：大表只挂可见行，多选移动、块拖拽和表格拖选不再整页重排；删除、关闭标签与移动笔记只淡出真正消失的项。
- 欢迎短片窗口固定 16:9 并可静音，短片体积减少约 28%。
- 中文界面改名为「思绪 · Thinkly」，英文显示 Thinkly；数据目录、安装包文件名和自动更新仍沿用 Goose Note，升级后笔记和设置不受影响。
- 新增日语界面：设置里可选「日本語」，系统语言为日语时自动切换；菜单、速记小窗、AI 与各类提示均已翻译。
- 分栏内容在分享长图和卡片、导出 Word 中保持左右并排；从其他编辑器粘贴带分栏的 Markdown 会还原分栏，AI 也能读到栏内的标题和正文。

## 1.7.316

- macOS 安装包采用清晰的双步骤引导、新背景和白鹅授权图标；同步更新安装与下载说明。
- 中文界面显示「鹅的笔记」，英文名称保持 Goose Note。
- 优化 AI 复盘的主题、建议和趋势节点提示。
- 修复 Windows 国际化编译中的路径兼容问题。

## 1.7.309

- 首次完成设置引导后全屏播放欢迎短片，右上角可随时关闭。

## 1.7.308

- 侧栏搜索改为底部面板；窗口置顶并入叠窗图标。
- 草稿页从各入口创建时显示文档标题；表格拖选更轻、背景不透底。
- 编辑器网格线与画布边缘留出间距。

## 1.7.307

- 新增 Claude 暖色主题，主题选项更简洁并可以自然换行；编辑器可切换网格，线条不贴画布边缘。移除单独的着色侧栏。
- 表格与正文对齐，表格控制柄位于内容外侧，收起侧栏后仍然可见。
- 在容器内粘贴时保留原文结构与 Markdown 层级。
- 设置中的数据导出选项和重置卡片按设计规范对齐，当前导航的焦点与选中轮廓保持一致。
- 新建笔记直接创建为「新页面」，标题在正文中编辑；页面标题不再显示 Markdown 扩展名。
- 笔记本切换条更紧凑并去掉悬停提示；占位文字只在聚焦的光标处直立显示。

## 1.7.266

- 修复全篇及跨块删除因选区绑定旧事务而失效的问题，保留首 H1 保护和撤销行为。
- 修复真实清空后的本地文件保存，校验当前内容与恢复记录，读取失败、异常序列化或外部冲突仍拒绝覆盖原文。

## 1.7.265

- 修复代码块 Cmd+Enter、边界方向键、缩进、粘贴撤销和语言切换焦点。
- 增加块菜单、折叠列表与标题、两栏和三栏布局，完善块选择、页面引用、表格与媒体编辑及 Markdown 保存。
- 移除旧 uTools 宿主兼容、精简构建与无用文档，保留本地文件、历史版本和旧数据恢复。

## 1.7.240

- 仅在发现新版本时显示更新入口，移除当前版本日志和无内容占位。
- 更新弹窗仅保留有效的更新操作，移除检查更新、稍后及重复关闭按钮。
- 保留后台检查和异步下载，下载失败后可直接重试，下载就绪后确认重启安装。

## 1.7.235

- 更新日志标题直接显示版本，移除重复信息并收紧弹窗留白。
- 查看当前版本日志时仅显示关闭；下载就绪后才显示“稍后”和“重启并更新”。
- 设置中增加独立的“检查更新”按钮，检查和后台下载期间仍可关闭日志弹窗。

## 1.7.234

- 新增侧栏常驻更新入口和鹅的笔记版本日志弹窗，可直接查看当前版本与新版本的变化。
- 发现新版本后自动在后台下载，并显示下载进度；关闭弹窗后仍会继续下载。
- 下载完成后，确认即可先保存笔记，再重启安装更新。
- 优化下载失败后的重试和已下载状态恢复，并同步 GitHub Release 的版本日志。

## 1.7.232

- 新增 GitHub CLI 一键发包和每日定时发布，统一生成 macOS、Windows 与 Linux 安装包。
- 更新清单提供安装包 SHA-256 校验，按设备架构选择下载，并在安装前核对版本与来源。
- macOS 可后台下载更新并重启安装，Windows 可启动安装程序；Linux 保留手动安装入口。
- 安装前等待笔记保存完成，更新失败时保留原应用；修复版本变化后的重新检查与下载恢复。

## 2026-10-12

• 缩减 AI 输入条整体高度与字号，让工具栏按钮与行内引用标签更紧凑。

• 修复侧栏搜索框聚焦时出现额外方框的问题，保留底部焦点下划线。

## 2026-10-11

• 正文分屏和 AI 面板显示异常时，使用简短提示和重试动作。

• 启动与速记恢复使用简短状态行，失败时按需查看原因并重新加载。

• 历史版本缺省态改为小图标和短句，读取原因按需展开，显示失败时保留重试。

• AI 处理使用一个小进度符号，默认隐藏耗时；图像生成占位去掉重复标题。

• AI 新会话只保留一句提示和一个建议；不可用状态显示短句与设置或重试，详细原因按需展开。

• 正文空段落提示缩短为“输入 / 选择内容”，减少书写时的文字干扰。

• 空公式显示“添加公式”，去掉英文 empty 占位。

• 图片、附件和视频待添加占位改为紧凑轻量行，图片加载失败后保留短提示与重试。

• 空白工作区改为小标题、简短说明和一个主按钮，其他操作以文字链接呈现，减少装饰与动画。

• 搜索、大纲与文件夹读取缺省态使用小图标和短句，无结果时只保留一个下一步动作。

• 图片加载时使用安静的占位，不再先闪现破图；加载失败后显示重试，切换便签后缓存图片可正常显示。

• 图片不再把剪贴板或导入时生成的哈希文件名显示为说明，手写图片说明继续保留。

• 全面优化全仓文案描述：消除底层技术黑话与生硬系统标识，统一回收站与彻底删除危险确认、云端备份恢复、AI 操作状态反馈、快捷键录制与文档大纲空状态指引文案。

• 设置界面隐藏顶部笔记标题、标签与新增/AI 操作，七个分类统一改为正文大标题，保留原有设置项与外观即时预览。

• 字体下拉移除示例文字；上下键即时试用，Esc 恢复原字体，点击、空格或回车确认选择。

• 字体改为下拉选择，增大标签与控件间距，并按本机可用字体展示名称和实际字形。

• 修复外观、数据与快捷键设置面板的初始化错误。

• 拓展 AI 方案审批：展示目标路径和改动范围，支持逐项选择、差异与正文预览、复制及选中文字继续调整；明确应用、恢复与冲突状态，多份方案独立审批，保留异步操作期间的新消息。

• 统一 AI 处理、完成、失败、取消、等待同意、执行与撤回状态的紧凑标签，修正状态误显示，并保留失败原因和重试操作。

• 优化 AI 处理状态，使用跟随主题色的紧凑“处理中”标签，保留步骤展开与思考摘要。

• 修复 AI 变更预览选中文字时高亮与新增片段底色重合的问题，支持拖选替换片段和新建、编辑内容并复制。

### 1.7.62

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.63

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.64

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.65

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.66

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.67

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.68

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.69

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.70

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.71

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.72

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.73

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.74

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.75

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.76

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.77

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.78

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.79

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.80

🌈 本次更新重点：本次无面向用户的可见更新。

### 1.7.82

🌈 本次更新重点：本次无面向用户的可见更新。

## 2026-10-10

• 深色模式改用中性灰，统一正文、侧栏、设置卡片、菜单与普通选中高亮，保留链接、焦点和状态颜色。
• 修复重命名、标题编辑和搜索等行内输入聚焦时出现局部背景色块的问题，保留完整行和输入外壳的高亮。

## 2026-09-30

• 新增麦笺完整主题，并将晨橙调整为浅秋，统一浅色与深色的纸面、菜单、选区和图标描边。
• 功能图标统一使用 Phosphor，保留旧页面图标兼容；控件改用统一的小圆角。
• 调整侧栏展开动画、焦点与顶部留白，以及外观设置预览和工作区边框。
• Git 同步文件夹增加保存前检查，错误提示显示具体路径和处理方式。
• 修复正文全选后无法进行 AI 改写的问题，支持预览、接受和撤销。
• 产品展示以视频为准，移除 README 中过时的截图。

## 2026-09-28

• 侧栏新增本地页面与文档大纲双入口；窄窗口可临时展开导航，目录会跟随当前分屏页面。
• 顶栏集中显示前进、后退和 AI 操作；调整编辑区与 AI 面板的布局。
• 外观默认采用叶脉暖色，新增枫叶配色；正文默认行高调整为 1.5。
• 移除页面和笔记本的自定义图标入口，保留更简洁的文件图标展示。
• 修复切换页面时 AI 输入草稿可能被旧内容覆盖的问题。

• 界面缩放提供低、中、高三档，侧栏与正文大小仍可独立设置。
• 修复已选中文字后点击时，原生文本选择被拦截的问题。
• 调整非 Windows 顶栏右侧留白，单标签不再显示多标签交互高亮。

• 首次设置改为外观、阅读和 AI 三步；可在引导中配置并测试 AI 连接，测试不会读取笔记或本地上下文。
• 默认字体改用系统字体；界面、侧栏和正文可分别设置字体，选择的字体也会用于导出。
• 暖色配色调整为晨橙，并统一深色工作区边缘与分隔线。
• 侧栏窄轨集中提供笔记本切换、搜索、设置和版本更新入口。

## 2026-09-23

⚠️ 版本号按要求重置为 1.0.0；已安装 9.x 的用户需手动下载安装包升级，旧版自动更新无法识别较低版本号。

🪐 侧栏笔记本入口更清晰，宽度把手和分隔线也更容易看见。
🐛 分屏中页面已不存在时，仍能看见对应标签并单独关掉那一格，不会卸掉整列。
🐛 从其他应用粘贴多行文字时，富文本丢失换行也会保留原有段落。

✨ 启动后自动检查公开版本，侧栏提示新版本；关于页自动显示更新结果，支持下载安装包并引导手动安装或使用 Homebrew 升级。

✨ 公开发布仓库提供静态更新清单，避免 GitHub API 限额；已签名 macOS 版本后台下载后可从侧栏重启安装，未签名版本继续手动安装。

• 删除与恢复提示共用同一枚线框圆勾，避免图标风格不一致。

✨ 本地文件移入系统回收站后，删除回执提供带图标的「撤回删除」；批量删除也能逐项恢复，原位置存在同名文件时不会覆盖。

🪐 删除提示收为单行：结果、数量与撤回直接呈现；移除条目列表、重复状态和分隔区。
• 修正删除提示的双层卡片和折叠时重复露出的旧回执。

## 2026-09-22

• 首次设置采用 C 方案：左侧实时预览，右侧分步设置；布局、目录宽度、主题、字号与行高统一预览，完成后保存

🪐 优化
• 笔记本切换采用紧凑描边文字胶囊，配合独立选择弹窗和轻柔的展开、收起动画

✨ 新功能
• 阅读设置新增正文行高调节与实时预览；引导和外观设置统一采用阅读优先布局及黑白细轨滑杆
• 编辑布局提供全宽、标准、目录；默认全宽，单篇笔记通过 YAML 覆盖，目录宽度支持拖动与键盘调整
• 新增首次设置引导，支持布局、主题与字号选择；未体验过的用户首次展示，可跳过并从数据管理重新进入
• 数据管理默认显示左侧本地备份

🐛 修复
• 笔记本切换菜单重开定位当前项，补齐方向键导航；悬停跨越间隙时保持打开，并保留编辑器焦点
• 补齐第二版页内目录，移除第三版阅读布局，已有阅读布局设置兼容回标准版
• YAML 前置区异常时阻止设置写入并提示，保留原文件与待保存内容

## 2026-09-21

🌈 本次更新重点：侧栏笔记本入口更好认，标签上能直接改本地文件名，分屏格子可以单独关掉。

🪐 优化
• 侧栏顶部的笔记本入口更大更清楚：图标、名字和展开箭头各就各位
• 本地文件名直接在标签上改，正文里不再重复显示一遍
• 拖侧栏边缘调宽度更好抓，分隔线不再中间断掉

🐛 修复
• 分屏时某格里的笔记不在了，可以点那格的关闭收掉，整列不再消失
• 速记小窗的工具条与正文对齐，按钮不再悬在中间

## 2026-09-20

🌈 本次更新重点：侧栏更紧凑，笔记本入口挪到顶部；去掉应用内垃圾箱和「新建仓库」，桌面端只用打开文件夹。

🪐 优化
• 笔记本切换挪到侧栏顶部，菜单向下展开；置顶、外观与设置集中在底部
• 顶栏去掉重复的置顶、外观和设置按钮；侧栏默认更窄
• 新建页面默认不再随机配图标
• 删除页面可立刻撤回；本地文件仍进系统回收站

🐛 修复
• AI 面板打开时按关闭快捷键会收起面板，不再误关标签页

## 2026-09-19

🐛 修复
• Windows：去掉系统原生顶栏，改为自定义顶栏右侧最小化/最大化/关闭；移除误加的全宽底栏（仅 Win）。

## 2026-09-19

🪐 优化
• Electron 工作区窗接入系统材质：Windows 11 Mica、macOS under-window vibrancy；壳层/侧栏/顶底栏半透明以露出材质（Linux 保持实心）。

## 2026-09-19

🪐 优化
• Electron 桌面端新增全宽底部状态栏（与自定义顶栏对位）：显示当前记事本 / 页面，Windows 原生框下主内容不再贴齐窗口底。

## 2026-09-19

🐛 修复
• 恢复侧栏底部控制条（收起侧栏 / 垃圾箱 / 设置 / 主题），并让主内容区重新留出底部壳层间距，避免贴齐窗口底。

## 2026-09-19

🪐 优化
• 深色模式提高对比度与层次（更深壳层、更亮文字、更清晰边框），默认强调色为蓝色（ocean）；空态卡片在深色下默认显示蓝色图标底。

🐛 修复
• Windows / Linux 按下 Alt 不再弹出系统菜单栏（File / Edit / View / Window）。

🪐 优化
• Windows / Linux 全局快捷键支持 Win（Super）修饰键，录制与注册与 Raycast 一致。

🪐 优化
• 桌面端应用图标换成黄本子小鹅（与 uTools 版 logo 一致）。

🐛 修复
• Windows 安装包/快捷方式恢复与 Mac 相同的正式应用图标（此前因未写入 exe 资源而显示 Electron 默认原子图标）。

## 2026-09-17

🪐 优化
• 复制或剪切单行、同一块里的多行时只带纯文本；选中多个块时仍保留列表、标题等原格式。表格、代码、公式、Mermaid、图片、视频、文件和分隔线整块复制或剪切会保留块本身。

🐛 修复
• 引用文字继承正文或自选颜色，保留细竖线、不额外添加底色，修复深色模式下文字过暗。
• 复制多个有序/无序列表项时，系统剪贴板会丢掉内部 MIME，粘贴被拆成无编号纯文本。现在会按原列表结构粘贴，纯文本也带上 1. / -。
• 划选有序列表时若终点落在空编号项上，删除会一并去掉空项，不再留下空的「4.」和残余选区。

## 2026-09-16

🪐 优化
• 正式编辑器表格采用经典行列菜单：插入、复制、清空、文字/背景颜色与表格标题选项；灰底标题、细网格、紫色选中框和六点手柄，以及贴合表格边界的整条加行/加列控件。
• 侧栏顶部置顶图标改成贴合图标的白底边框卡片，单个置顶不再拉满一条浅色胶囊。
• 去掉置顶卡片的投影，避免浅灰侧栏上出现一圈脏阴影。

🐛 修复
• 点击侧栏顶部置顶图标会立刻移动选中高亮，不再等活动页落定后才开始切换动画。
• 表格行/列手柄菜单打开时不再露出被菜单盖住一半的圆形加号，菜单里的「删除行」「删除列」改用危险色。

## 2026-09-15

🪐 优化
• 右键菜单、下拉菜单和弹出菜单统一从触发边淡入并轻微放大，键盘打开仍即时。
• 全局交互统一为强调色浅底、同色文字图标与细描边，覆盖设置、速记、编辑器、AI、菜单和预览；工具栏图标按钮保持无常驻边框，真实危险状态保留红色。
• 强调色采用「轻染同色」：选中项使用浅底、同色细边框和文字图标，悬停更轻；八种强调色同时适配浅色与深色主题。
• 黑白浅色主题取消独立悬停底色例外；笔记本菜单采用一体式底座外观，选项与底部切换控件同宽对齐，不改变侧栏和底部入口布局。

✨ 新功能
• 点过左侧页面列表后按 Esc 会收起其它已展开的文件夹，当前选中笔记的父级仍保持展开；设置 → 快捷键里也能看到。
• 本地文件右键菜单会显示新建文件、打开外部应用、文件管理器、终端和复制路径的快捷键；新建文件是 ⌘N / Ctrl+N，复制当前文件路径默认是 ⌘⇧C / Ctrl+Shift+C。

🐛 修复
• 页面菜单「导出」子菜单改到导出行侧面弹出，悬停即开并带过渡；点行内空白也会选中。
• 修复记事本图标选择弹层打开后透明不可见；鼠标点击输入框不再出现粗焦点框，键盘 Tab 焦点提示保留。
• 文件树拖放目标、插入线和拖影跟随当前强调色，修复黑白主题仍显示蓝色的问题。
• 笔记本菜单和底部入口改为共用一个完整外壳，消除连接处的断层、内凹圆角和阴影接缝，入口布局保持不变。
• 本地文件或文件夹从主列表拖到其他软件时，传递绝对路径纯文本，应用内仍可拖拽移动。
• 子级无序列表的空心圆点与正文垂直居中，不再比文字偏上一截。
• 全屏 AI 面板在输入框失焦后按 Esc 也会关闭，不再只有输入框有焦点时才退出。
• 光标停在行内代码行首时按 Cmd+→（Windows / Linux 为 End），会跳到当前行最右边，不再整篇滑到笔记末尾。

## 2026-09-14

🌈 本次更新重点：可以检查并下载新版本，自动云备份会真正上传；速记小窗能保存到当前笔记本，窗口变窄会收起侧栏，标题和表格按回车也更顺手。

✨ 新功能
• 设置 → 关于与许可 里可以检查更新，有新版本会下载安装包到「下载」文件夹。
• 打开「自动云备份」后，启动空闲且超过一天会真正上传。
• Windows 和 Linux 也能用其他应用打开笔记。
• 速记小窗可以把当前便签保存到当前笔记本，保存后清空并回到空白。

🪐 优化
• 速记小窗唤出／隐藏默认改为 Option+N（Windows / Linux 为 Alt+N）。
• 表格行列菜单改成和右键菜单同一套外观：灰底整行高亮、删除前有分隔，不再像一颗蓝色胶囊按钮。
• 编辑器正文行距按 Notion 收紧：行高 1.5，块与块之间不再额外加一截空白。
• 下拉、弹出层、页面菜单和笔记本切换与右键菜单用同一套细边框。
• AI 输入条加上和右键菜单一样的细边框，白底上更容易看清。
• AI 输入条单行和多行都用同一 20px 圆角，不再单行收成胶囊。
• 窗口变窄时先收右侧 AI，再收左侧栏；拉宽后按原来的开合恢复。
• 设置页关闭按钮默认带灰色底，悬停换成强调色；顶栏高度与主界面一致，内容区贴齐顶栏。
• 侧栏底部笔记本切换去掉顶部分隔线和描边卡片，改成名称在左、右侧一颗切换钮，并贴齐窗口底。
• 选中文字点「加入对话」后焦点进入 AI 输入框；超过 30 分钟未活跃的会话会自动开新对话。

🐛 修复
• 截图左下角不再露出 image.png 这类浏览器默认文件名；已有笔记打开后也会清掉。
• 按住 Cmd/Ctrl+- 不再把整个窗口一起缩小，只改变编辑器文字大小；已经缩掉的界面下次启动会恢复。
• 全局搜索和应用内搜索不能再设成同一个快捷键，冲突时会提示占用。
• 标题行首回车会在前面空一行；表格回车进下一行，最后一行再按会新增一行。
• 深色模式图标不再消失；速记空行回车不再唤起 AI；Finder 打开笔记也能进到这一篇。
• 已选中一行再拖选另一行时，被工具栏挡住的上一行不再闪一下，也不再等松手才显示工具栏。
• 速记小窗选中文字后不再出现「加入对话」和 AI 改写；斜杠菜单不再露出生成、提及和表格等重型块。

## 2026-09-10

🌈 本次更新重点：菜单、弹窗和气泡提示换成统一的新外观；复制内容、切换标签和打开本地笔记更顺手、更稳。

🪐 优化
• 右键菜单、下拉菜单和气泡提示的外观统一了，空白处和选中项的底色不再有明显色差。
• 菜单里用键盘选中的那一项，文字颜色会跟着强调色走，更好认。
• 右键菜单每次打开都从第一项重新开始，不会再残留上次的高亮。
• 侧栏选中和划过时的圆角更柔和、强调色更明显；窗口变窄时标签栏更少跳动。

🐛 修复
• 编辑器里复制列表、图片等内容时，换行和格式更接近原文。
• 本地文件夹里留有没写完的旧内容时，打开笔记会先等你确认，不再悄悄覆盖磁盘上的内容。
• 在「所有记事本」里搜索时，当前记事本的页面也能搜到，不再出现切过去反而找不到的情况。

## 2026-09-08

🌈 本次更新重点：写笔记、分屏和切换本地文件夹更稳，空白标签也不会越开越多。

✨ 新功能
• 分屏格子可以用快捷键来回切换；换页再回来还能继续撤销刚才的修改。

🪐 优化
• 点加号新建空白页后再打开笔记，会填进这个空白页，不再多开标签。
• 切回已经打开过的本地文件夹马上看到内容，不会先闪空白。
• 大纲能单独折叠子标题；复制粘贴列表和图片时结构和格式更完整。

🐛 修复
• 粘贴截图不再带上 image.png；Delete 也不会误删后面的表格或图片。
• 切换笔记本时 AI 对话不会串内容，分屏字体和编辑焦点也更各管各的。

## 2026-09-07

🌈 本次更新重点：大纲能看出哪些标题已收起，侧栏列表间距更清楚，浏览笔记更顺手。

🪐 优化
• 大纲会标出已收起的标题，层级和当前位置更容易看懂。
• 回收站和页面列表留出更舒服的间距，点选更清楚。

## 2026-09-05

🌈 本次更新重点：首次启动不再出现欢迎页，笔记一多打开和搜索也更快，AI 输入框用得也更顺手。

✨ 新功能
• 首次启动不再进入欢迎/引导页，直接打开空白工作区，更清爽。
• 系统全局搜索快捷键改为 Cmd/Ctrl+Shift+K，不再和应用内搜索抢同一个键。

🪐 优化
• 应用内搜索快捷键保持 Cmd/Ctrl+K 不变。
• 笔记较多、单篇较长时，打开、侧栏和搜索响应更快。
• AI 输入框展开/收回动画更顺滑，侧栏输入条留白更舒服。
• 代码块随内容自动撑高，光标所在行高亮更清晰。

🐛 修复
• 切换页面时不再把上一页的内容错存到新页面。
• 复制粘贴无序列表更规整，不再残留源列表的标记。
• 远程图片导出超时后能及时停止，不再干等。

## 2026-09-04

### 桌面速记小窗

🌈 本次更新重点：桌面端速记小窗的快捷键切换更符合预期，关闭小窗不会再意外打开主界面。

🐛 修复
• 再按一次速记快捷键会直接收起小窗，不会只重新聚焦。
• 用快捷键、关闭按钮或 Esc 收起速记小窗时，主界面不再自动弹出。

### 编辑器与桌面工作区

🌈 本次更新重点：桌面端标签页能拖成独立窗口，笔记能分屏对照，还能用 [[双链]] 一键跳转。

✨ 新功能
• 桌面端把标签页拖出窗口就变成独立窗口，拖到别的窗口又能拼回去；按 Cmd/Ctrl+W 关当前标签。
• 编辑器能左右或上下分屏，同时看两篇笔记，边看边写更方便。
• 输入 [[笔记名]] 会自动变成可点击的链接，点一下跳到那篇笔记。
• 代码块会高亮光标所在行，切换语言时能直接搜语言名。

🪐 优化
• AI 对话会自动用第一句话当标题，历史记录更好找。
• 导出 Word 文档时，字号、颜色和排版更贴近笔记里的样子。

## 2026-09-02

🌈 本次更新重点：搜索能发现更多内容，快捷键在不同系统上显示得更准。

✨ 新功能
• 搜索能找到表格里的文字、图片的说明文字，链接的文字和网址也能被搜到。

🪐 优化
• 快捷键会按你的系统显示：macOS 用 ⌘，Windows / Linux 用 Ctrl。
• Windows 的 Win 键、Linux 的 Super 键是独立按键，不再和 Ctrl 混用。
• 设置里的固定快捷键分 macOS / Windows / Linux 三列对照，一眼看清不同系统上的按键。

## 2026-08-28

🌈 本次更新重点：AI 生成时能实时看到它在想什么，本地文件夹的技能、路径和置顶收藏都更顺手；表格和代码编辑也更稳。

✨ 新功能
• AI 生成和改写时，能实时看到它在想什么；输入 / 就能调用技能，本地文件夹的技能也能用。
• 本地文件夹笔记里写的文件路径能点开，笔记也能置顶和收藏。
• 历史记录里能标记星标版本，好版本不会被自动清掉。

🪐 优化
• 表格里能单独选中一个格子来调格式；行内代码进出、按词删除更顺手。
• 悬停和选中的颜色统一跟着强调色走；再按一次快捷键就能把笔记收起来。
• 块拖动手只在鼠标悬停编辑器内容时出现，左右留白不再弹出。

🐛 修复
• 一次划选多块再删除，结果更符合预期。
• 新手引导更清楚，快捷键说明更好懂。

### AI 面板与笔记编辑器

🌈 本次更新重点：AI 联网搜索改用 TinyFish，AI 面板的输入框和工作进度更顺手；所有标题都能收起展开，悬停颜色和滚动条也更清爽。

✨ 新功能
• AI 联网搜索和读取网页，在设置 → AI 助手 填好密钥后就能用。
• 所有标题都能点左侧箭头收起、展开，正在编辑的标题会变成强调色。
• AI 处理进度里能直接看到准备写入的变更和回复正文。

🪐 优化
• AI 输入框内容变多时自动展开成两行，不再被模型按钮挡住。
• 更多地方悬停的颜色统一跟着强调色走；滚动条平时隐身，移过去才出现。
• 标题折叠改为收起标题后面的内容（表格、段落等），不再出现「空的折叠块」；斜杠菜单已去掉折叠列表。

### 粘贴与标题折叠

🌈 本次更新重点：粘贴多行文字自动分行、图片粘贴一次撤回；标题折叠更稳定，搜索能直达收起章节里的内容。

✨ 新功能
• 多行文字粘贴时自动一行一项，行首的「-」「1.」等符号不再重复出现。
• 粘贴图片、视频后，按一次撤销就能整个撤掉，不再留下空白框。

🪐 优化
• 早先用「折叠列表」创建的内容会自动转成普通列表，原有内容不丢。

🐛 修复
• 搜索命中收起标题下的内容时，会自动展开那段并跳过去。

### 标题折叠

🌈 本次更新重点：标题收起来后，继续往下写的内容不会被藏住；收起状态更好认。

🪐 优化
• 光标停在收起的小标题上按回车或点加号，新段落会插到这一节末尾，不会跑到标题正下方被藏住。
• 收起的小标题整行加了虚线边框，收起的按钮保持点亮，哪里收着内容一眼能看出来。

🐛 修复
• 标题收起后，在它后面新写的内容不会再被连带藏起来，写完就能看到。

## 2026-08-24 ~ 08-25

🌈 本周重点：AI 能画海报和介绍图，生成的东西能放大看、一键插进笔记；导出网页和 PDF 更接近笔记里的样子，新建笔记还会自动带图标。

✨ 新功能
• AI 能画海报、介绍图、示意图和图标，画的过程中不会先露代码。
• AI 生成的表格、图表、图片、图形，都能一键插进当前笔记。
• 生成的东西和聊天里的图片，点一下放大看，右键用系统打开。
• 新建内部笔记会自动选一个图标；本地文件夹里的文件不受影响。
• 设置里可打开「置顶显示名称」，显示前 4 个字，默认关着。

🪐 优化
• 点选和悬停的浅底会跟着当前强调色一起变。
• 打开附件、图片和本地文件更跟手。
• 全屏打开 AI 时，背后的笔记不再抢点击。
• AI 画的时间线更好看，长文字不再挤出去。
• 图表里的文字能选中复制。
• AI 面板能跟着整个界面一起放大缩小。
• 导出网页、打印成 PDF 时，版式更接近笔记里的样子，还按你选的字体现。

🐛 修复
• 划选文字点对齐，不再误伤旁边没选中的段落。
• 个别内容损坏的笔记不再打不开。
• AI 面板出错不再整窗白屏，点一下重试就能恢复。

## 2026-08-25

🌈 本次更新重点：悬停高亮跟着你选的强调色走，置顶可以显示短名称，新建笔记会自动带图标；导出网页和 PDF 也更接近笔记里的样子。

✨ 新功能
• 设置里可打开「置顶显示名称」，显示前 4 个字，默认关着。
• 新建内部笔记会自动选一个图标；本地文件夹里的文件不受影响。
• 导出网页、打印成 PDF 时，版式更接近笔记里的样子。

🪐 优化
• 点选和悬停的浅底会跟着当前强调色一起变。
• 打开附件、图片和本地文件更跟手。
• 全屏打开 AI 时，背后的笔记不再抢点击。

## 2026-08-24

🌈 本次更新重点：AI 现在能直接画海报和介绍图，生成的东西点一下能放大看、右键能用系统打开，还能一键插进笔记。

✨ 新功能
• AI 能画海报、介绍图、示意图和图标，画的过程中不会先露代码。
• AI 生成的表格、图表、图片、图形，都能一键插进当前笔记。
• AI 生成的东西和聊天里的图片，点一下放大看，右键用系统打开。

🪐 优化
• AI 画的时间线更好看，长文字不再挤出去。
• 图表里的文字能选中复制。
• AI 面板能跟着整个界面一起放大缩小。
• 打开更快更省流量，导出 PDF 会按你选的字体现。

🐛 修复
• 划选文字点对齐，不再误伤旁边没选中的段落。
• 个别内容损坏的笔记不再打不开。
• AI 面板出错不再整窗白屏，点一下重试就能恢复。

## 2026-08-20

### 介绍页互链

🌈 本次更新重点：介绍页能跳到同系列其他插件。

🪐 优化
• 介绍页底部可以点开笔记、书签、监控、验证和 Agent

### 复制路径与介绍

🌈 本次更新重点：本地文件可以一键复制路径，仓库介绍也改成更好懂的说法。

✨ 新功能
• 本地文件夹里的笔记，右键可以复制文件或文件夹路径。

🪐 优化
• 仓库首页改成好懂的介绍，开发说明单独放。

### PDF、全家桶与编辑

🌈 本次更新重点：导出 PDF 会按你在笔记里看到的样子出图，设置里也能找到其他鹅应用。

✨ 新功能
• 设置里「鹅的全家桶」可打开小窗、书签、监控和二次验证，点一下会去商店搜索。

🪐 优化
• 选笔记本时鼠标是箭头，只有按住图标才能拖排序。
• 行内代码左右自带一点空隙，光标进出更跟手。

🐛 修复
• 导出 PDF 不再失败，中文能看，图表和公式会出图而不是源码。
• 本地图片也能进 PDF。

### 文件前进后退与本地导出

🌈 本次更新重点：前进后退会跟着你点过的文件走，导出本地笔记时也不容易缺图、缺内容。

✨ 新功能
• 前进/后退会记住你选过的文件，只开一个标签时也能用，鼠标侧键同样生效。

🪐 优化
• 对文字用 AI 改写时，输入框更宽，也更少突然报错。

🐛 修复
• 导出本地文件夹里的笔记时，正文和图片能正常带上。
• 文件夹不能直接导出；导出失败会写出原因。

## 2026-08-19

### 助手读写笔记

🌈 本次更新重点：现在可以用助手帮你查找、新建和改本地笔记，删掉的会进回收站。

✨ 新功能
• 助手可以列出、搜索你的记事本和笔记
• 助手可以新建笔记、往后追加、改正文或改名
• 助手删除笔记会进回收站，也可以再恢复
• 助手可以新建或改名记事本
• 从列表拿掉本地文件夹时，电脑上的文件还在

## 2026-08-11

### 记事本切换菜单

🌈 本次更新重点：侧栏收窄时，记事本切换菜单不再跟着挤扁，底部按钮更好点。

🪐 优化
• 记事本切换菜单宽度固定，侧栏变窄时底部「新建记事本」「打开文件夹」不再挤在一起。

## 2026-08-07

### 小窗粘贴、记事本排序与 AI 输入

🌈 本次更新重点：多选段落粘贴会正确替换，记事本能拖拽排序，AI 打字更稳、回复更好看。

✨ 新功能
• 侧栏记事本列表可拖拽调整顺序，会记住你的排列。
• AI 对话会按间隔显示时间，思考时有轻柔动效提示。

🪐 优化
• 全局搜索结果更多时可滚到中部自动加载，遮罩更清晰。
• AI 输入框支持拼音输入更顺畅，发送与生成时更不卡顿。

🐛 修复
• 小窗里多选几段后粘贴，会替换选中内容，不再在下面多贴一份。
• 页面「更多」里导出子菜单不再漂到别处点不到。
• 导出长内容为图片时，更少误报「太长导不出」。

## 2026-08-05

### 编辑与 AI 菜单

🌈 本次更新重点：深色模式下 AI 菜单更好认了，划选文字的颜色也会跟着强调色走。

🪐 优化
• 编辑里选中文字的高亮颜色，会跟着你设的强调色变化。

🐛 修复
• 深色模式下，对文字打开 AI 菜单时，菜单文字不再发灰难认。

## 2026-08-04

### 常规笔记本 · 移动块、搜索与主题

🌈 本次更新重点：块可用快捷键上下移动，记事本可从全局搜索里隐藏，主题按系统→浅色→深色轮转，图标悬停也更统一。

✨ 新功能
• 编辑器支持快捷键上下移动当前块或选中块，并避免把内容移到文档标题前。
• 记事本编辑里可开启「不在全局搜索中展示」，该本页面不会出现在「所有记事本」搜索，切到该本后仍可搜。
• 侧栏页面右键可「创建副本」，副本标题用「_副本」后缀并直接打开。

🪐 优化
• 主题快捷键与侧栏按钮按「跟随系统 → 浅色 → 深色」循环切换，图标会显示当前主题。
• 顶栏、侧栏、AI 面板、查找栏等独立图标按钮统一强调色 hover，暗色下回退到更稳妥的中性底。
• 折叠标题箭头热区更顺手，展开后仍可点到箭头收起。

🐛 修复
• 无新增修复。

## 2026-08-03

### 常规笔记本 · 列表与强调色

🌈 本次更新重点：无序列表圆点更圆滑，深色强调色与行内代码更一致，色板在小窗里也能完整打开。

✨ 新功能
• 无新增功能。

🪐 优化
• 无序列表一、二级圆点改为几何圆绘制，在 Electron 旧内核下不再明显锯齿。
• 切换强调色或明暗后，行内代码等关键颜色会立即跟上。

🐛 修复
• 修复速记小窗底栏打开色板时只露出标题、定位错乱的问题。
• 修复色板阴影在旧内核上可能整块发实色的问题。

### 速记小窗 · 标题栏

🌈 本次更新重点：小窗顶栏改为常驻固定栏，写字和拖窗更直观。

✨ 新功能
• 无新增功能。

🪐 优化
• 去掉悬停才出现的把手，标题栏固定占位，空白区可拖动窗口。

🐛 修复
• 正文区域不再被顶部把手/覆层误拖。

### AI · 供应商与对话

🌈 本次更新重点：设置里可直接选 DeepSeek、GLM、MiniMax；对话进度更稳，多轮更不容易因历史工具调用失败。

✨ 新功能
• AI 服务支持 DeepSeek、智谱 GLM、MiniMax 供应商预设，按供应商填写密钥即可。
• DeepSeek 会按模型自动选择合适协议（Flash / Pro）。

🪐 优化
• AI 处理进度按步骤顺序保留已完成与当前项，摘要更易读。
• 联网搜索在主通道不可用时会尝试 DuckDuckGo 回退。

🐛 修复
• 修复后续对话回放历史工具调用导致兼容接口校验失败的问题。
• 修复消息操作栏在流式生成时占位抖动的问题。

## 2026-08-02

### 常规笔记本 · 深色行内代码对比

🌈 本次更新重点：深色模式下行内代码的强调色底和字色更明显，一眼就能看出当前强调色。

✨ 新功能
• 无新增功能。

🪐 优化
• 深色模式各强调色的行内代码底色更浓、字色更亮，彩色强调色不再像灰蓝淡底。

🐛 修复
• 无新增修复。

### 常规笔记本 · 强调色与行内代码

🌈 本次更新重点：深色模式下行内代码和 AI 消息里的代码、链接会跟着你选的强调色走，颜色更统一。

✨ 新功能
• 无新增功能。

🪐 优化
• 编辑器行内代码在链接、表格等场景下也会稳定使用强调色。
• AI 对话中的行内代码与链接改为跟随当前强调色。

🐛 修复
• 修复 AI 消息里的行内代码写死灰色、不跟随强调色的问题。

### 常规笔记本

🌈 本次更新重点：AI 对话过程更稳定，新会话会自动带上当前笔记，输入与阅读上下文更自然。

✨ 新功能
• 无新增功能。

🪐 优化
• AI 对话中的笔记标签与相邻文字垂直对齐，阅读和输入更整齐。

🐛 修复
• 修复 AI 处理步骤变化时进度卡可能闪烁的问题，处理状态会在原位置稳定更新。
• 修复空白或新建 AI 会话偶尔没有自动带入当前笔记的问题；已有消息或草稿的会话不会被改动。

## 2026-07-31

### 常规笔记本

🌈 本次更新重点：默认外观更干净，提示块选图标更自由；分割线输入、缩放工具栏和 AI 对话区也更顺手。

✨ 新功能
• 外观设置新增「黑白」强调色，并设为默认；原先选择「青碧」会自动切到黑白。
• 提示块可像页面图标一样打开完整图标库选择。
• 输入 --- 生成分割线后，光标会自动落到下一行继续写。
• AI 对话区改用更稳定的消息列表与滚动视口。
• 编辑缩放时，格式工具栏、侧栏菜单、图片/代码/表格等上下文工具会一起缩放。

🪐 优化
• 页面标题旁的操作按钮更紧凑。
• 历史版本列表、还原按钮、里程碑标记和侧栏底部按钮补齐悬停、按下、聚焦与处理中状态，Electron 旧内核下也能正常显示。

🐛 修复
• 历史版本还原和里程碑标记在处理期间会防止重复提交，失败时也会给出明确提示。

### 速记小窗

🌈 本次更新重点：顶部隐藏栏触发更精准，空白便签更干净，滚动时也更少干扰。

✨ 新功能
• 无新增功能。

🪐 优化
• 顶部仅中央浅灰手柄可唤出完整顶栏；帮助与关闭按钮排布更整齐，使用说明弹层也不容易贴边溢出。
• 滚动条默认隐藏，滚动或悬停时再出现。
• 空白草稿不再显示「输入 / 或 、来展开菜单」长提示，打开即可直接写。
• 编辑缩放时相关工具栏会同步缩放。

🐛 修复
• 无新增修复。

### 常规笔记本（补充）

🌈 本次更新重点：本地文件夹的资源清理更清楚、更安全；图片预览与 AI 引用的细节也更顺手。

✨ 新功能
• 清理未引用资源时可按类型查看文件、全选或逐项选择，并显示可释放的空间。

🪐 优化
• 图片预览的缩放、关闭和翻页按钮改用统一图标与中文说明，禁用状态更清晰。

🐛 修复
• 移除 AI 引用标签多余的边框，减少视觉干扰。

## 2026-07-30

🌈 本次更新重点：AI 对话、编辑器和本地文件工作流得到系统增强，并新增可独立构建与部署的产品指南；速记、搜索、快捷键和界面细节也更稳定顺手。

✨ 新功能
• 新增产品指南站点与离线指南构建，可展示核心能力、AI 安全说明和功能目录。
• AI 输入框支持技能命令、拼音搜索引用和更可靠的图片去重，并对选区内容提供更清楚的隐私边界。
• 编辑器新增行内代码边界导航、列表起始编号规范化和活动列表标记，Markdown 属性可以更完整地往返保留。
• 本地文件夹首页会展示文件夹概览，命令面板也可按当前页面范围筛选搜索结果。

🪐 优化
• AI 会话拆分为独立会话层，改善上下文、本地页面引用、错误提示、批量计划和历史对话的稳定性。
• 侧栏树、图标选择器、空白页、历史视图、外观缩放和全局提示样式重新整理，常用入口更集中。
• 速记槽位命名、页面标题聚焦、快捷键录入及中文输入法交互更一致。

🐛 修复
• 修复跨块删除、行内代码光标、编号列表、Markdown 行内样式和页面标题在边界操作下可能错乱的问题。
• 修复本地文件夹路径越界、重命名与写入保护不足，以及启动恢复时可能出现的页面状态问题。
• 修复 AI 图片重复附加、引用搜索不完整、会话数据迁移和错误信息归类不准确的问题。

## 2026-07-28

🌈 本次更新重点：常规笔记本默认采用更专注的单标签界面，AI 新增联网研究和跨页面批量处理能力；本地 Markdown 的页面设置与编辑体验也更稳。

✨ 新功能
• 新增单标签模式，打开页面时直接在当前工作区切换；如需原有多标签操作，可在通用设置中关闭。
• AI 支持联网搜索和读取网页，并会按任务加载笔记创建、修改、搜索、删除、可视化等专属能力。
• AI 支持生成跨页面批量变更计划，可在执行前逐项确认，执行后也可安全撤回。

🪐 优化
• 页面标题、AI 工具栏和空白页入口重新整理，单标签模式下编辑区域更完整，常用操作更集中。
• 编辑器支持用拖拽手柄调整段落层级；嵌套列表、图片导出和列表编号的显示更准确。
• OpenAI Responses、OpenAI 兼容和 Anthropic 模型可分别设置推理强度，AI 过程与错误提示更清楚。

🐛 修复
• 本地 Markdown 会保留 YAML frontmatter，并安全同步字体、锁定等页面设置，避免打开或保存时破坏原始元数据。
• 单标签切换会先等待当前本地文件保存，保存失败时停止切换，避免未落盘内容被覆盖。

## 2026-07-26

🌈 本次更新重点：AI 改为全屏/侧栏打开且不再占用标签页；速记小窗不再霸占 Electron 主界面；中文待办快捷输入与退格还原更可靠。

✨ 新功能
• 编辑器支持用中文全角【】/【x】快速生成待办，与半角 [] 一致。
• AI 全屏会话：主内容区铺满对话，不再创建独立标签页。

🪐 优化
• AI 默认全屏打开，侧栏并排仍可切换；标签栏仅保留图标入口，点普通标签可退出全屏。
• 全屏会话标题取自首条提问摘要，消息区更宽更易读。
• 引导页待办快捷说明补充了「1。」与「【】」。

🐛 修复
• 打开速记小窗后，再唤起 Electron 会回到主搜索界面，小窗本身继续显示、不会被误关。
• 用 []、【】、1。等触发列表/待办后立刻退格，可正确还原触发字符，不再丢符号。

## 2026-07-24

🌈 本次更新重点：Notebook AI 可按独立标签页或侧栏并排打开，本地文件夹笔记本也能使用；全局提示样式更统一，错误信息更醒目。

✨ 新功能
• Notebook AI 支持「独立标签页」与「侧栏并排」两种打开方式，默认独立标签，可在面板内切换并记住选择。
• 本地文件夹笔记本在开启 AI 后也可使用 Notebook AI，不再被静默隐藏入口。

🪐 优化
• 全局 Toast 统一视觉：错误提示使用专属红字样式，成功与关闭按钮更清晰；原生编辑器与主应用共用同一套提示。
• AI 设置切换协议时，若已有密钥会自动拉取模型列表；保存按钮状态更明确。
• AI 输入框 Shift+Enter 换行更可靠，对话历史列表展示更清晰。
• 标签栏在独立标签模式下提供固定 AI 入口，并可打开专用 AI 标签页。

🐛 修复
• 修复 AI 输入区换行偶发不生效的问题（尤其是行尾软换行）。

---

🌈 本次更新重点：原生编辑器与 Notebook AI 的模型入口更完整，图片导出和编辑器排版也更稳定；连续导出、模型失效和标题重复等问题得到修复。

✨ 新功能
• 原生编辑器新增 AI 入口，可从空白段落、斜杠菜单或选区发起请求，并通过原生应用安全处理模型、凭据与流式结果。
• Notebook AI 输入区支持直接切换当前工作区使用的模型，重新选择默认模型时会自动恢复跟随全局设置。

🪐 优化
• Notebook AI 的待发送图片改为紧凑缩略图，和模型、附件及发送操作集中在输入区内。
• 待办方框会随编辑器字号同步缩放，行内代码与正文基线对齐更自然。
• 图片导出降低峰值内存占用，并在生成或编码失败时自动降清晰度重试。

🐛 修复
• 修复图片首次导出成功后，后续导出可能因画布资源不足而失败的问题；快速连续导出也不会再使用重复文件名。
• 修复选中页面标题导出时可能重复显示标题，以及工作区已删除模型仍被继续使用的问题。

## 2026-07-22

🌈 本次更新重点：新增可嵌入 macOS 原生应用的独立编辑器，并让 Notebook AI 的图片提问、页面上下文和页面创建更可靠；Markdown 快捷输入、速记切换与页面操作也更顺手。

✨ 新功能
• 新增 macOS 原生编辑器入口，支持 Markdown 文档读写、宿主桥接、本地资源与附件访问，并通过修订号和保存确认保护切页时的编辑内容。
• Notebook AI 支持上传图片参与提问，并会把当前页面作为可见、可移除的上下文附在本轮对话中。

🪐 优化
• 编辑器统一处理标题、列表、待办、引用、折叠和代码块的 Markdown 快捷输入；刚转换后按退格可准确恢复原始标记，不再多出空格。
• 速记小窗的 1–5 号便签切换器始终完整显示，页面收藏与置顶操作收进“更多操作”，减少顶栏拥挤。
• AI 设置统一聚焦自定义 OpenAI Responses、OpenAI 兼容和 Anthropic 服务，模型选择与配置状态更清楚。

🐛 修复
• 修复 Notebook AI 流式写入和最终落盘可能重复创建页面的问题，连续创建请求也会正确复用同一页面。
• 修复原始 Markdown 文档与普通笔记共用编辑器时，标题规范、保存基线和外部重载边界不清导致的内容误改风险。

## 2026-07-20

🌈 本次更新重点：速记小窗可为便签起名、导出图片更清晰好看；快捷键提示按系统正确显示，编辑器里代码也不再被误标红点。

✨ 新功能
• 速记小窗支持给 1–5 号便签自定义名称，可在帮助菜单重命名，或在当前编号上再点一次进入改名。

🪐 优化
• 导出为图片时，列表标记、提示块和任务勾选的对比度与层级更稳，版式更整齐。
• 速记顶栏固定显示当前便签名，缩放时也不会压住首段；帮助说明更短，快捷键会按 Mac / Windows 正确显示。
• 新手引导、设置、页内查找和日常提示里的快捷键展示统一按当前系统格式化（如 ⌘ 与 Ctrl、加号键）。

🐛 修复
• 关闭编辑器拼写检查，行内代码里的 hash、标识符不再被标红点下划线；行内代码本身也不再带多余下划线。
• 补回速记帮助里的「收起」说明，避免帮助文案缺项。

## 2026-07-17

🌈 本次更新重点：常规笔记本新增视频上传播放、本地静态资源清理、自定义搜索引擎和 OpenAI Responses 协议；同时优化图片、代码主题、侧栏、快捷键与本地文件编辑的稳定性。

✨ 新功能
• 笔记编辑器支持上传视频并自动压缩为 MP4，可直接播放、全屏、对齐、更换、下载或删除，导出 Markdown、HTML 和整库 ZIP 时也会保留可播放视频。
• 本地文件夹笔记本新增“清理未引用静态资源”，可扫描、定位并选择删除 assets 目录中的无用文件。
• 搜索引擎设置支持添加、编辑、删除和排序自定义搜索，并会校验搜索网址模板。
• 应用快捷键可录入鼠标前进键和后退键；未自定义时，侧键保持浏览器式的标签历史前进与后退。
• 自定义 AI 新增 OpenAI Responses 协议，可独立配置服务地址、API Key 和模型，支持流式回答与推理摘要，并可用于笔记本 AI 和编辑器 AI 操作。
• 代码块新增 Catppuccin 主题，会随界面深浅色自动切换 Latte 和 Mocha 配色。

🪐 优化
• 图片选中工具栏统一提供对齐、放大、复制和下载，全屏预览支持缩放、滑动切换与快速复制。
• 侧栏空状态、页面拖拽、展开提示和设置页层级更清晰，快捷键提示会在相关菜单中直接显示。
• 设置、页内查找、新建笔记和恢复最近关闭标签改为跟随当前系统的固定快捷键，避免同步设置后冲突或失效。
• 代码块默认改用 GitHub 深浅配色，原有主题设置会自动迁移；OpenAI 兼容、OpenAI Responses 和 Anthropic 三种自定义 AI 协议的用途也更清晰。

🐛 修复
• 修复本地文件自动保存后可能重建编辑器、跳动滚动位置或误选中媒体块的问题。
• 修复图片块复制成 Markdown 引用、本地视频 MIME 识别错误，以及附件在单文件和 ZIP 导出中丢失的问题。
• 修复 Markdown 空任务项导入丢失；中文输入“1。”也能自动转为有序列表，媒体块或本地文件标题后按回车可继续输入正文。
• 修复打开设置时，编辑器格式、图片、视频、查找等浮层可能穿透到设置界面上方的问题。

## 2026-07-14

🌈 本次更新重点：速记小窗更像真正的多便签工作台——可切换 1–5 个草稿、记住窗口位置与缩放，关窗后仍能超长期撤销；笔记编辑区的格式工具栏改为底部固定，快捷键也更稳。

✨ 新功能
• 速记顶栏可在 1–5 个独立草稿便签间切换，各自单独保存；默认只显示当前编号，悬停展开全部。
• 按住编号左右拖动可快速预览其它便签，松开或移走后再正式切换。
• 下次从 Electron 打开会记住编辑界面的缩放程度，以及弹窗在屏幕上的位置与窗口大小。
• 速记便签支持超长期撤销：⌘/Ctrl + Z 可一路回退编辑记录，关窗后再打开仍可继续撤销；⌘/Ctrl + Shift + Z 或 ⌘/Ctrl + Y 重做。
• 选中正文时，加粗、列表等格式工具栏固定在窗口底部居中，不再跟着选区飘。

🪐 优化
• 便签切换器收起/展开更干净，胶囊始终单层且左右留白对称。
• 提示块图标选择更稳定，点选图标时更不容易误触编辑区。
• 点击或拖动切换速记便签时不再弹出重复提示，键盘切换仍会明确告知当前编号。
• 内部笔记删光标题下正文后，始终自动保留一行普通空段落；点击编辑区下方空白会聚焦该空行，而不是回到大标题。

🐛 修复
• 修复收起态数字偏右、胶囊双层叠影等问题。
• 加固位置记忆，避免写草稿时把记住的坐标盖掉。
• 修复可配置快捷键在标题、搜索框或正文编辑区聚焦后无法再次触发的问题；带修饰键的应用快捷键现在会在所有编辑状态下稳定生效。
• 修复大图粘贴解码失败：粘贴时先固化剪贴板字节并按文件头识别类型，统一转 WebP@80%（已是 WebP 不二次压缩）；复制/下载再转 PNG。无 JPEG 等兜底。
• 选中图片悬浮工具栏补回「复制图片」按钮，复制内容为 PNG。

## 2026-07-12

🌈 本次更新重点：笔记本压缩包导出现在可以通过正式构建，并会在成功触发导出后稳定提示。

✨ 新功能
• 无新增功能。

🪐 优化
• 导出成功触发后会直接显示提示，避免因底层保存接口没有返回值而漏掉反馈。

🐛 修复
• 修复笔记本 Markdown 导出调用了已移除参数、导致生产构建中断的问题。

## 2026-07-11

🌈 本次更新重点：设置页中的快捷键、外观、AI、本地文件夹和数据管理现在都会完整生效；备份恢复与数据重置也增加了更可靠的保护，降低误覆盖和误报成功的风险。

✨ 新功能
• Electron 内置 AI 现在可以直接用于笔记本 AI，并支持调用笔记工具；空白段落按空格、斜杠菜单和选区 AI 也会打开对应入口。
• 快捷键设置新增搜索面板关闭动作、空格键录入和完整冲突检测，恢复默认时会同步恢复全部可配置快捷键。

🪐 优化
• Dracula、Nord 和跟随系统主题的显示更准确，流程图、图表、历史视图与代码主题会随系统深浅色实时更新。
• 修改本地文件夹隐藏目录后会先保存未落盘内容并立即刷新已加载文件夹，增量文件监听也会遵循相同规则。
• 页面提示、新手指南和按钮说明会显示实际配置的快捷键，不再出现过时或写死的组合键。

🐛 修复
• 修复取消导出仍提示成功、WebDAV 恢复失败后可能留下部分数据，以及重置后仍残留历史、AI 会话、标签或应用状态的问题。
• 修复自动打开上次笔记开关可能立即清空当前页、旧版修饰键快捷键误触发，以及表格均分依赖部分 Chromium 不支持选择器的问题。

## 2026-07-08

🌈 本次更新重点：修正了切换笔记本后标签页状态错位，新增“按笔记本作用域”的标签页筛选和回切行为，避免看到错乱标签。

✨ 新功能
• 新增“切换笔记本”时自动对齐当前活动标签：对应页面会自动打开并设为激活标签页。
• 本地调试 Test Bridge 增加 `createNotebook` 与 `activateNotebook` 方法，便于 e2e 场景创建/切换 notebook。

🪐 优化
• 标签条仅展示当前笔记本内可见页面，关闭左右分组操作现在按可见标签重算，减少跨笔记本操作误杀。

🐛 修复
• 修复切换笔记本后，标签页显示与活动页可能不一致的问题。

## 2026-07-07

🌈 本次更新重点：代码块编辑和本地文件夹笔记本更顺手了；现在代码块里可以用 Tab/Shift+Tab 调整缩进，本地文件夹也能按设置隐藏不想展示的目录。

✨ 新功能
• 现在在代码块里按 Tab 会给当前行或选区缩进，按 Shift+Tab 会反向取消缩进。
• 本地文件夹设置里新增“隐藏文件夹”，可以把 assets、obsidian 这类目录从侧边栏文件树里收起不显示。

🪐 优化
• 本地文件夹默认会隐藏 assets 目录，减少附件目录挤占笔记列表的干扰。
• 隐藏目录设置会跟随本地文件夹扫描生效，重新加载文件夹时保持侧边栏更清爽。

🐛 修复
• 修正本地文件夹隐藏目录相关单测的 mock 递归问题，避免测试扫描子目录时误触发无限递归和内存耗尽。

## 2026-07-06

🌈 本次更新重点：现在在笔记里编辑内容时，按自己设置的关闭标签页快捷键也能正常关闭当前标签，不会点了没反应。

🐛 修复
• 之前光标停在正文编辑区时，按「关闭标签页」快捷键可能没有反应；现在带 Ctrl、Command、Alt 或 Shift 的关闭快捷键会直接生效。

---

🌈 本次更新重点：Notebook AI 生成的流程图和矢量图现在更容易放进正在编辑的位置，查看和复制回答内容也更顺手。

✨ 新功能
• 现在你在 Notebook AI 里点「插入」时，流程图和矢量图会落到光标附近；空行会被直接替换，不会总是跑到页面末尾。
• Notebook AI 输入框现在会轮换显示提问示例，打开面板时更容易想到可以怎么问。

🪐 优化
• Notebook AI 的回答文字现在可以直接拖选复制，图形和按钮仍保持正常点击。
• AI 设置页的服务列表较长时，现在能在菜单内滚动查找，不会挤出屏幕。

🐛 修复
• 之前缺少尺寸的矢量图可能显示不出来，现在会补齐画布并正常展示。

---

🌈 本次更新重点：现在在笔记 AI 对话面板里让它画图、画流程或生成矢量图时，会直接看到成品画面，不再被大段内容打断。

✨ 新功能
• 现在向笔记 AI 要流程图、关系图或架构图时，对话里会直接显示图形卡片，并可在悬停时复制、下载或放进当前笔记。
• 现在明确要 SVG、图标或矢量示意图时，对话里会显示清理后的图形，避免把不安全内容直接放进页面。

🪐 优化
• 笔记 AI 画图完成后只保留结果卡片，过程内容默认隐藏，让聊天面板更安静。
• 笔记 AI 面板变窄时，图形可以横向查看，不会把面板撑乱。

🐛 修复
• 深色外观下的流程图线条和文字不再发暗，看图时更清楚。

---

🌈 本次更新重点：笔记本切换、页面保存和导入导出更稳了；打开本地文件、切换笔记本、使用右上角 AI 面板时，界面落点和保存反馈都更清楚。

✨ 新功能
• 现在切换到另一个笔记本后，侧栏会回到页面/文件视图；本地文件夹会优先展示文件树，右上角保存成功时会出现更轻的灰色提示。

🪐 优化
• 打开 AI 面板、整理标签页、从标签页定位到文件树时，常用按钮集中在右上角，页面切换后不容易停在旧状态。

🐛 修复
• 本地文件保存、压缩包导入图片、附件下载、历史版本清理和速记窗口保存偏好这些场景更稳，减少外部修改被覆盖、图片链接失效、下载偶发失败和保存位置丢失的问题。
