import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { openReleasePage } from "@/lib/electron/appUpdate";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function SettingsAppUpdate() {
  const { currentVersion, state, installing, installError, check, download, install, revealDownload } = useAppUpdate();
  const busy = state.status === "checking" || state.status === "downloading" || installing;
  const canDownload = Boolean(state.downloadUrl && state.assetName);
  const percent = typeof state.percent === "number" && Number.isFinite(state.percent)
    ? Math.max(0, Math.min(100, Math.round(state.percent)))
    : undefined;
  const versionLabel = state.version ? ` v${state.version}` : "";
  const statusLabel = installError || (installing
    ? "正在保存笔记并重启…"
    : state.status === "checking"
      ? "正在检查更新…"
      : state.status === "downloading"
        ? `正在下载${versionLabel}${percent === undefined ? "…" : ` · ${percent}%`}`
        : state.status === "ready"
          ? state.message || `新版本${versionLabel} 已就绪`
          : state.status === "available"
            ? state.message || `发现新版本${versionLabel}`
            : state.status === "up-to-date"
              ? "已是最新版本"
              : state.message || "");
  const actionLabel = installing ? "正在重启…"
    : state.status === "checking" ? "检查中…"
      : state.status === "downloading" ? "下载中…"
        : state.status === "ready" ? "重启并更新"
          : state.downloadPath ? "查看安装包"
          : (state.status === "available" || state.status === "error") && canDownload
            ? "下载更新"
            : "检查更新";
  const handleAction = () => {
    if (state.status === "ready") void install();
    else if (state.downloadPath) void revealDownload();
    else if ((state.status === "available" || state.status === "error") && canDownload) void download();
    else void check();
  };

  return (
    <SettingsSectionCard title="应用更新">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <GooseIcons.Download aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span>当前版本{currentVersion ? ` v${currentVersion}` : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => openReleasePage(state.releaseUrl)}>
            更新记录
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} busy={busy} onClick={handleAction}>
            {busy && <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </div>
      </div>
      {statusLabel && (
        <p role="status" aria-live="polite" className={`text-sm ${installError || state.status === "error" || (state.status === "ready" && state.message) ? "text-destructive" : "text-muted-foreground"}`}>
          {statusLabel}
        </p>
      )}
      {state.status === "downloading" && percent !== undefined && (
        <div role="progressbar" aria-label="更新下载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
    </SettingsSectionCard>
  );
}
