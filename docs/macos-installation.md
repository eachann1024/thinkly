# macOS 安装说明

为控制独立开发成本，作者暂未加入每年 99 美元的 Apple Developer Program，因此未进行 Developer ID 签名与 Apple 公证。首次安装需要你手动完成额外授权。

## DMG 安装

1. 打开 DMG，将「思绪 · Thinkly」拖入「应用程序」，等待复制完成。英文系统里图标名是 Thinkly。
2. 如果 DMG 中有「安装指令.command」，双击它，在 macOS 系统授权窗口输入管理员密码；成功后会打开应用。终端会自动打开，无需手动输入命令。

若指令被系统拦截，先尝试打开一次，再到「系统设置 → 隐私与安全性」点击对应项目的「仍要打开」并确认。新版 macOS 不再支持通过右键「打开」绕过 Gatekeeper。

## 旧版 DMG、ZIP 和 Homebrew

旧版 DMG 可能没有安装指令，ZIP 和 Homebrew 只安装应用。先将应用放入「应用程序」，尝试打开，再到「系统设置 → 隐私与安全性」点击「仍要打开」并确认。

如果仍因下载隔离而无法打开，确认下载的是可信的官方安装包后，在「终端」执行以下命令：

```sh
sudo xattr -r -s -d com.apple.quarantine "/Applications/Thinkly.app"
```

按提示输入管理员密码；终端不显示密码字符，这是正常行为。完成后从「应用程序」打开思绪 · Thinkly。若安装在其他目录，需要改成实际路径。

## 授权的作用

安装指令只移除该应用的下载隔离标记，不修改笔记、不保存密码，也不关闭系统的 Gatekeeper。免费 ad-hoc 签名用于应用完整性校验，不等于 Apple 验证开发者身份或公证；PKG 安装器同样不能免除这些检查。

此操作不能修复损坏的安装包。如果系统提示恶意软件、文件已损坏，或校验和不符，请停止操作并重新获取官方安装包。受组织管理的 Mac 可能禁止手动放行，需要联系管理员。

以各版本 Release 页的签名状态为准。[官方安装包](https://github.com/eachann1024/thinkly/releases/latest) · [Apple 打开未公证应用说明](https://support.apple.com/zh-cn/102445) · [Apple Developer Program](https://developer.apple.com/programs/)
