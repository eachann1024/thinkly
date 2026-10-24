#!/bin/sh
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
case "$(git config user.name) $(git config user.email)" in
  *[Cc]laude*|*anthropic*|" ")
    git config user.name "Eachann"
    git config user.email "each1024@qq.com" ;;
esac
git config core.hooksPath .githooks
exit 0
