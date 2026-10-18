#!/bin/sh
# AI 会话启动时执行：提交身份不是用户本人时改成 Eachann，并启用仓库自带的提交钩子
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
case "$(git config user.name) $(git config user.email)" in
  *[Cc]laude*|*anthropic*|" ")
    git config user.name "Eachann"
    git config user.email "each1024@qq.com" ;;
esac
git config core.hooksPath .githooks
exit 0
