import type { AppUpdateState } from "@/lib/appUpdateTypes";

export function updatePercent(state: AppUpdateState): number | undefined {
  return typeof state.percent === "number" && Number.isFinite(state.percent)
    ? Math.max(0, Math.min(100, Math.round(state.percent)))
    : undefined;
}

export function updateStatusLabel(state: AppUpdateState, installing = false, installError = ""): string {
  if (installError) return installError;
  if (installing) return "正在保存笔记并重启…";
  const version = state.version ? ` v${state.version}` : "";
  const percent = updatePercent(state);
  switch (state.status) {
    case "checking": return "正在检查更新…";
    case "downloading": return `正在下载${version}${percent === undefined ? "…" : ` · ${percent}%`}`;
    case "ready": return state.message || `新版本${version} 已就绪`;
    case "available": return state.message || `发现新版本${version}`;
    case "up-to-date": return "已是最新版本";
    default: return state.message || "";
  }
}
