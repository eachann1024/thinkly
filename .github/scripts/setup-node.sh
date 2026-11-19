#!/usr/bin/env bash
set -euo pipefail

min_major="${1:-22}"

node_major() {
  "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0
}

add_path() {
  local dir="$1"
  if [ -n "${GITHUB_PATH:-}" ]; then
    if command -v cygpath >/dev/null 2>&1; then
      cygpath -w "$dir" >> "$GITHUB_PATH"
    else
      echo "$dir" >> "$GITHUB_PATH"
    fi
  fi
  export PATH="$dir:$PATH"
}

if command -v node >/dev/null 2>&1; then
  cur="$(node_major "$(command -v node)")"
  if [ "$cur" -ge "$min_major" ]; then
    echo "Using system Node $(node -v)"
    exit 0
  fi
fi

if [ -n "${RUNNER_TOOL_CACHE:-}" ]; then
  tool_cache="$RUNNER_TOOL_CACHE"
  if command -v cygpath >/dev/null 2>&1; then
    tool_cache="$(cygpath -u "$tool_cache")"
  fi
  if [ -d "$tool_cache/node" ]; then
    cand="$(ls -d "$tool_cache"/node/"${min_major}".*/*/bin/node "$tool_cache"/node/"${min_major}".*/*/node.exe 2>/dev/null | sort -V | tail -n1 || true)"
    if [ -n "$cand" ] && [ -x "$cand" ]; then
      bin_dir="$(dirname "$cand")"
      add_path "$bin_dir"
      echo "Using cached Node $("$cand" -v) at $bin_dir"
      exit 0
    fi
  fi
fi

echo "Node.js >= ${min_major} not found on runner" >&2
exit 1
