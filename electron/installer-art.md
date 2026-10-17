# macOS 安装背景

`installer/background.png` 由内置 imagegen 生成，交付尺寸为 960×640；画面铺满 Finder 安装窗口，背景本身不播放动画。真实可操作图标由 electron-builder 的 DMG contents 配置覆盖。

生成提示词：

> Create a polished macOS DMG installer background illustration for Goose Note, landscape 3:2. Full bleed original hand painted Japanese animated fantasy film aesthetic, gentle pastoral watercolor, airy cream sky, soft sage grass at bottom, distant clouds, small charming white goose at lower right with orange bill. Extremely restrained uncluttered scene. It will sit behind real Finder icons, so do NOT draw any app icons or folders or buttons. Leave large quiet pale cream areas around x=25% y=43%, x=75% y=43%, x=50% y=77% for actual icons. Integrated typography exactly: top left '鹅的笔记', underneath 'Goose Note'. At y=25% centered '01  拖入应用程序'; a thin hand drawn arrow at center x=50% y=43% pointing right. At y=63% centered '02  打开安装指令，按提示输入密码'. Text must be clearly legible dark forest green, modern understated typography, not brush lettering. No other text, no window chrome, no mockup, no busy forest, no copyrighted characters. Artwork fills entire background edge to edge. Professional warm charming design.

安装指令是可阅读的本地 shell 脚本，使用 macOS 系统授权；不联网，不保存密码，不改动笔记。未签名指令自身仍可能需要在系统设置手动放行，说明见 [macOS 安装说明](../docs/macos-installation.md)。实际下载后的 Gatekeeper、Finder 排版和授权交互须在目标 macOS 上另行验证，不能用本地打包结果替代。

本次背景修订：第二步改为“双击下方「安装指令」，按提示输入密码”，下方增加括号小字“免费开发不易 🥺 暂省每年 99 美元的开发者年费，首次安装请手动授权”。不承诺更新或重新下载后无需再次授权。DMG 不再展示安装帮助文件；隐藏背景、卷图标与 DS_Store 在 afterPack 阶段通过 dmgbuild 的 position 条目移到窗口右侧之外，不改用户 Finder 偏好。
