# macOS 安装背景

`installer/artwork.png` 是 imagegen 生成的无字插画；文字与箭头由 `scripts/render-installer-background.swift` 使用系统字体独立绘制。运行 `swift scripts/render-installer-background.swift` 可重新生成 `background.png`（960×640）、`background-2x.png`（1920×1280，144 DPI）和包含两种分辨率的 `background.tiff`。本地打包与 GitHub Actions 均使用 TIFF，在 Retina 屏幕上保留清晰文字；逻辑窗口仍为 960×640。Finder 的背景不会随窗口大小动态铺满。

画面仅在左下角保留一小片柔和田园插画，其余区域以浅奶油色留白，避免干扰说明与图标；真实可操作图标由 DMG 配置覆盖。步骤、括号说明、字体和排版以渲染脚本为准；修改文案应在脚本中完成，不把文字交给图片模型生成。安装指令图标中心位于 (480, 520)，避免与第二步文字重叠。隐藏背景、卷图标和 DS_Store 的位置在本地打包与 afterPack 中设为 10000 以上，减少放大窗口时露出的情况；不改用户 Finder 偏好。

安装指令是可阅读的本地 shell 脚本，使用 macOS 系统授权；不联网，不保存密码，不改动笔记。未签名指令自身仍可能需要在系统设置手动放行，说明见 [macOS 安装说明](../docs/macos-installation.md)。首次打开请手动授权；不承诺更新或重新下载后永远无需再次授权。实际下载后的 Gatekeeper、Finder 排版和授权交互须在目标 macOS 上另行验证，不能用本地打包结果替代。

`authorization-icon.png` 参考应用原有白鹅图标制作，仅加钥匙徽章。打包时通过 `scripts/set-file-icon.swift` 将其写入安装指令的 Finder 自定义图标元数据；本地打包和 CI 均保留该元数据，不改变脚本内容或授权行为。
