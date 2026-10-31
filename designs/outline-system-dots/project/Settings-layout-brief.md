# 设置布局候选稿

本轮只交付设计稿。正式设置组件、配置存储、旧的点阵稿均未修改。

## 三版的区别

| 方案 | 目录 | 内容布局 | 适用取舍 |
| --- | --- | --- | --- |
| A | 224px 完整侧栏 | 平铺单列，封面位于内容区 | 优先推荐，保留熟悉的分类路径 |
| B | 顶部工具栏与 174px 窄侧栏 | 单列设置集中在整块白色面板，封面较浅 | 更集中，侧栏占用更小 |
| C | 顶部按钮按需展开目录 | 全幅封面与居中的单列设置 | 画面最舒展，切换分类多一次操作 |

三版使用相同的外观页设置项比较布局；保留现有八个分类的名称与顺序。非外观分类为静态目录示意，不连接真实设置页面。现有左右预览改为同一列内按需展开；正式实施时需要保留原有预览能力。

## 外观与动态

- 三版均有浅色、深色主题变量与局部主题预览，主题选择不写入 Thinkly 设置。“跟随系统”在此稿中按浅色展示。
- 封面为本轮生成的静湖远山图，没有文字、水印或虚构个人信息。
- 封面通过 object-position 进行 38 秒往复的缓慢轻移；减少动态效果偏好开启时停止动画。
- 聊天交付三个 1280×900 浅色 PNG；PNG 是静态画面，动画保留在可编辑源稿中。

## 封面来源

由内置 imagegen 生成，原图 2172×724。通过 Design 上传工具存储为 `/_blob/aecda95f9c6f92738619e2ab7d0bc418`；没有后期编辑。

生成提示词：

Use case: stylized-concept. Create a premium quiet panoramic cover image for a Chinese desktop note-taking app, conveying 宁静致远 through the landscape itself. Very wide horizontal 3:1 composition. A still lake at dawn, distant layered mountains receding into soft pale mist, a restrained pine-covered dark headland on the far right, subtle water reflections, an almost invisible small empty boat far in the distance. Understated contemporary Chinese landscape art meeting fine art photography, natural atmospheric detail, slate green, mist blue-grey, soft warm ivory sky. Mountain ridges occupy the lower half, open calm sky above, elegant asymmetrical composition, no dramatic sunlight or saturated colors. The cover must work cropped into a shallow top strip about 180px tall in a desktop UI. No text, no calligraphy, no logos, no border, no user interface, no typography, no watermark.

## 核对范围

Design 静态检查：19 个画板，0 个格式问题。浅色三版及深色 B/C 已通过 EGO 查看画布的实际渲染；导出图片使用该渲染 DOM 的静态副本，没有重画界面。此检查不代表真实设置的交互、持久化或 Electron 宿主通过验收；未编写或运行测试用例。
