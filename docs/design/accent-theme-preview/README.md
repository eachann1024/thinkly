# 强调色设计对照

独立设计演示，供选择 A / B / C。尚未修改鹅笔记真实应用、偏好设置或版本号。

在仓库根目录运行：

```sh
python3 -m http.server 4178 --bind 127.0.0.1 --directory docs/design/accent-theme-preview
```

打开 `http://127.0.0.1:4178/?variant=A`。也可直接打开本目录的 `index.html`。

## 三个版本

- A：实色焦点（推荐）。顶部标签与左侧导航填充真正的强调实色。
- B：精准轮廓。顶部与导航使用同色边框，延续列表语言。
- C：轻量标记。顶部指示线、导航指示线与图标标记当前项。

支持 `?variant=A|B|C&theme=ocean|iris|pine|coral|rose|grape|mono|amber|wheat&mode=light|dark`。
左右箭头切换方案；输入、选择框和标签轨道保留各自键盘行为。标签左右键/Home/End 导航，Delete 关闭当前标签并恢复邻接焦点。

页面下方可展开完整八步实施路径、颜色职责、对比度和研究来源；包含消费者分类、持久化/跨窗口、九主题明暗、状态分离与最小验收，没有第二期留项。

## 确定的边界

- 强调色随每个主题自己的列表选中边框；浅底是弱背景，不冒充强调实色。
- 列表保留 30px 可见行、2px 间隔、14px 字、8px 圆角及 1px 选中边框；单选示例只改变排列顺序。
- 深色也恢复所选主题强调色，背景仍为现有中性深灰；成功/警告/错误独立。
- 控件按职责使用实色、强调文字、弱背景和焦点环，不把全项目涂成实色。
- 所有内容为安全示例；操作仅保存在页面内存；主题和方案写入当前 URL，不访问应用数据。

## 色值来源与候选

源码审计基于工作区 `4158aad7164b0ceb6d7590a59740ccd7fcaf7ea7`，设计交付分支基于 `main` 的 `df445caf40be818238f60a3ad293075b35d810d6`。

- 浅色选中底/边框：`src/lib/accentColor.ts`；主题名称：`src/pages/workspace/components/sidebar/appearance-settings/shared.tsx`。
- 常规与纸色表面：`src/styles/global/theme-tokens.css`、`src/styles/accent/options-and-paper-surfaces.css`、`src/styles/accent/paper-presets.css`。
- 深色现行覆盖：`src/styles/goose-dark-theme.css`；当前应用仍统一灰阶，本设计不把候选说成现行行为。
- 深色彩色候选取已有 `cool-presets.css`、`warm-presets.css`、`paper-presets.css` 的色值；叶脉新增暖橄榄 `#b3a575` 候选，避免原灰色候选丢失主题色相。
- 强调文字与焦点针对 shell/sidebar/editor 全部渐变端点派生；保持强调锚点不变。

## 验证记录（2026-10-14）

- JS 语法检查及 Git 差异/范围检查；全部手写文件不超过 300 行。
- 独立只读审阅核对全部 9×明暗的主题值与真实背景端点：实色前景最低 5.22:1，强调文字最低 4.61:1，焦点最低 3.11:1。
- Ego 浏览器实际核对三版切换、主题/明暗切换、导航搜索、按钮/开关/单选、笔记 Enter 后保焦、标签方向键与 Delete 焦点、skip-link 后的 Tab、减弱动画开关（实际过渡 0ms）。查看浅色 A 与深色 C 画面，首屏无页面横向溢出。
- 选中与焦点分离；所有方案保留当前项字重，并分别使用填充/轮廓/指示线等形状。颜色不是唯一线索。
- 未编写或运行测试用例，未构建/安装应用，未验证真实 Electron 设置持久化、跨窗口或系统主题事件。

已知限制：浅秋/麦笺原列表边框对弱底约 1.92:1 / 2.13:1，未达到必要非文字边界 3:1 目标；预览保留指定原色并显示待补偿。正式实现须在所选方案下补足可辨识边界。这不是整页无障碍认证。

## 研究与资产

研究链接在 HTML 内直接列出官方文档、开源仓库、X 作者原帖与评论区替代推荐。现有 React/Electron/组件与 Motion 可复用，本原型无新增依赖或外部运行时请求。

图标从项目已安装的 `lucide-react 1.17.0` 生成，保留 `LICENSE-lucide.txt`；没有手绘替代图标。选型完成后，把决策落实到正式组件，再移除或归档未选原型，避免作为生产代码维护。
