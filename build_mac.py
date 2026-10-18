#!/usr/bin/env python3
"""Build and install the macOS app, reopening it only if it was running."""

from __future__ import annotations

import os
import plistlib
import re
import shutil
import subprocess
import sys
import time
import tempfile
from pathlib import Path

APP_NAME = "Thinkly"
BUNDLE_ID = "com.thinkly.desktop"
ROOT = Path(__file__).resolve().parent
BUILT_APP = ROOT / "dist-desktop" / f"{APP_NAME}.app"
INSTALLED_APP = Path("/Applications") / f"{APP_NAME}.app"
LSREGISTER = Path(
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/"
    "LaunchServices.framework/Support/lsregister"
)


def refresh_app_registration() -> None:
    """Remove duplicate handlers without deleting builds, backups or user data."""
    dump = subprocess.run(
        [str(LSREGISTER), "-dump"], check=True, capture_output=True, text=True
    ).stdout
    paths = set()
    # Each LaunchServices bundle record starts with its own bundle id.
    for record in re.split(r"(?m)^bundle id:", dump):
        if not re.search(rf"(?m)^identifier:\s+{re.escape(BUNDLE_ID)}\s*$", record):
            continue
        match = re.search(r"(?m)^path:\s+(.+?)\s+\(0x[0-9a-f]+\)\s*$", record)
        if match and Path(match[1]) != INSTALLED_APP:
            paths.add(match[1])
    for path in sorted(paths):
        subprocess.run([str(LSREGISTER), "-u", path], check=True)
        subprocess.run([str(LSREGISTER), "-f", str(INSTALLED_APP)], check=True)


def is_app_running() -> bool:
    executable = INSTALLED_APP / "Contents" / "MacOS" / APP_NAME
    return subprocess.run(
        ["pgrep", "-f", f"^{re.escape(str(executable))}($| )"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def quit_running_app() -> bool:
    was_running = is_app_running()
    if not was_running:
        return False
    result = subprocess.run(
        ["osascript", "-e", f'tell application id "{BUNDLE_ID}" to quit'],
        check=False,
        capture_output=True,
        text=True,
    )
    deadline = time.monotonic() + 15
    while is_app_running() and time.monotonic() < deadline:
        time.sleep(0.25)
    if is_app_running():
        detail = (result.stderr or result.stdout or "").strip()
        message = f"{APP_NAME} 未能在 15 秒内退出，已停止安装以避免覆盖运行中的应用"
        if detail:
            message = f"{message}（{detail}）"
        raise RuntimeError(message)
    return was_running


def run_build() -> None:
    env = os.environ.copy()
    env["GOOSE_QUIET"] = "1"
    commands = [
        ["node", "scripts/run-task.mjs", "build"],
        ["node", "scripts/electron-build-mac.mjs"],
        ["node", "scripts/collect-desktop-artifacts.mjs"],
    ]
    for command in commands:
        result = subprocess.run(
            command, cwd=ROOT, env=env, capture_output=True, text=True,
        )
        if result.returncode != 0:
            if result.stdout:
                print(result.stdout, file=sys.stderr, end="" if result.stdout.endswith("\n") else "\n")
            if result.stderr:
                print(result.stderr, file=sys.stderr, end="" if result.stderr.endswith("\n") else "\n")
            raise subprocess.CalledProcessError(result.returncode, command)


def archive_build() -> Path:
    """Keep one replaceable archive, which LaunchServices cannot index as an app."""
    archive = BUILT_APP.with_suffix(".zip")
    with tempfile.TemporaryDirectory(prefix="goose-archive-", dir=archive.parent) as directory:
        temporary = Path(directory) / archive.name
        subprocess.run(
            ["ditto", "-c", "-k", "--sequesterRsrc", "--keepParent",
             str(BUILT_APP), str(temporary)], check=True
        )
        temporary.replace(archive)
    return archive


def remove_build_copies() -> None:
    # Only generated bundles owned by this project, never arbitrary registered apps.
    candidates = [
        BUILT_APP,
        ROOT / "dist-electron/packaged/mac-arm64" / f"{APP_NAME}.app",
        ROOT / "dist-electron/packaged/mac/arm64" / f"{APP_NAME}.app",
    ]
    for candidate in candidates:
        if not candidate.exists():
            continue
        if candidate.is_symlink():
            raise RuntimeError(f"拒绝清理符号链接：{candidate}")
        with (candidate / "Contents/Info.plist").open("rb") as source:
            info = plistlib.load(source)
        if info.get("CFBundleIdentifier") != BUNDLE_ID:
            raise RuntimeError(f"构建产物标识不匹配，保留：{candidate}")
        # A never-registered intermediate bundle returns -10814; removal is still valid.
        subprocess.run(
            [str(LSREGISTER), "-u", str(candidate)], check=False,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        shutil.rmtree(candidate)


def install_copy(*, reopen: bool) -> None:
    if not BUILT_APP.is_dir():
        raise FileNotFoundError(f"未找到构建产物：{BUILT_APP}")
    archive = archive_build()
    quit_running_app()
    if INSTALLED_APP.exists():
        shutil.rmtree(INSTALLED_APP)
    shutil.copytree(BUILT_APP, INSTALLED_APP, symlinks=True)
    remove_build_copies()
    refresh_app_registration()
    if reopen:
        subprocess.run(["open", str(INSTALLED_APP)], cwd=ROOT, check=True)


def main() -> int:
    if sys.platform != "darwin":
        print("[mac] 此脚本仅支持 macOS", file=sys.stderr)
        return 1
    try:
        was_running = quit_running_app()
        run_build()
        install_copy(reopen=was_running)
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"✗ {error}", file=sys.stderr)
        return 1
    print("✓ Thinkly")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
