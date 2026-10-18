// Shared by Release notes and the generated download page.
export const MAC_SIGNED = "macOS 安装包已完成代码签名与公证。";
export const MAC_HELPER_MARKER = "<!-- goose-mac-install-helper:v1 -->";
export const MAC_INSTALL_REASON = "为控制独立开发成本，作者暂未加入每年 99 美元的 Apple Developer Program，因此未进行 Developer ID 签名与 Apple 公证。首次安装需要你手动完成额外授权。";
export const MAC_INSTALL_GUIDE = "https://github.com/eachann1024/thinkly/blob/main/docs/macos-installation.md";
export function macInstallParagraphs(hasHelper) {
  return [MAC_INSTALL_REASON,
    hasHelper
      ? "1. 打开 DMG，将「思绪 · Thinkly」拖入「应用程序」，等待复制完成。2. 双击 DMG 中的「安装指令.command」，按 macOS 系统授权窗口提示输入密码。指令会打开终端，但不需要手动输入命令。"
      : "将「思绪 · Thinkly」放入「应用程序」后尝试打开，再到「系统设置 → 隐私与安全性」点击「仍要打开」并确认。此安装包未标记为包含安装指令，请按完整安装说明操作。",
    "若「安装指令」本身被拦截，先尝试打开，再到「系统设置 → 隐私与安全性」手动放行。仅对可信的官方安装包操作；指令只清除该应用的下载隔离标记，不会关闭系统安全保护，也不能修复损坏的文件。",
  ].filter((_, index) => hasHelper || index !== 2);
}
