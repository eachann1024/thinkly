#!/bin/zsh
# Only the explicitly installed Goose Note bundle is eligible for this operation.
set -eu
APP='/Applications/Goose Note.app'
finish() {
  printf '\n%s\n' "$1"
  printf '按回车关闭此指令。'
  read -r reply
}
if [[ ! -d "$APP" || -L "$APP" || -L "$APP/Contents" || -L "$APP/Contents/Info.plist" ]]; then
  finish '请先将「思绪 · Thinkly」拖入「应用程序」，等待复制完成，再打开安装指令。'
  exit 1
fi
bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)
if [[ "$bundle_id" != 'com.goosenote.desktop' || ! -d "$APP/Contents/MacOS" ]]; then
  finish '应用信息不匹配，未进行修改。请重新下载官方安装包。'
  exit 1
fi
printf '此指令仅移除「思绪 · Thinkly」的下载隔离标记，不修改笔记，不关闭系统安全保护。\n请在系统授权窗口确认；密码由 macOS 处理。\n'
if /usr/bin/osascript <<'APPLESCRIPT'
do shell script "/usr/bin/xattr -r -s -d com.apple.quarantine '/Applications/Goose Note.app'" with administrator privileges
APPLESCRIPT
then
  if /usr/bin/open "$APP"; then
    finish '已完成，正在打开思绪 · Thinkly。'
  else
    finish '隔离标记已处理，但应用未能打开。请从「应用程序」重试；如仍失败，请重新下载官方安装包。'
    exit 1
  fi
else
  finish '授权已取消或操作未完成。可尝试「系统设置 → 隐私与安全性 → 仍要打开」。'
  exit 1
fi
