import { DialogShell } from "@/components/ui/dialog-shell";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { selectUpdateNotes } from "./releaseNotes";
import { UpdateNotes } from "./UpdateNotes";
import { updatePercent, updateStatusLabel } from "./updatePresentation";

export function AppUpdateDialog() {
  const { open, setOpen, currentVersion, state, installing, installError, check, download, install, revealDownload } = useAppUpdate();
  const notes = selectUpdateNotes(currentVersion, state);
  const percent = updatePercent(state);
  const statusLabel = state.status === "up-to-date" && !installError
    ? "" : updateStatusLabel(state, installing, installError);
  const failed = Boolean(installError || state.status === "error" || (state.status === "ready" && state.message));
  const actionLabel = installing ? "正在重启…"
    : state.status === "ready" ? "重启并更新"
      : state.status === "checking" || state.status === "downloading" ? undefined
        : state.downloadPath ? "查看安装包"
          : state.status === "available" && state.downloadUrl && state.assetName ? "下载更新"
            : state.status === "error" ? "重试" : undefined;
  const handleAction = () => {
    if (state.status === "ready") void install();
    else if (state.downloadPath) void revealDownload();
    else if (state.status === "available" && state.downloadUrl) void download();
    else void check();
  };
  const publishedAt = notes.publishedAt && !Number.isNaN(Date.parse(notes.publishedAt))
    ? new Date(notes.publishedAt).toLocaleDateString("zh-CN") : "";

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title={`v${notes.version} 更新日志`}
      contentClassName="max-h-[calc(100dvh-64px)] w-[calc(100%-32px)] sm:max-w-[560px]"
      bodyClassName="space-y-4"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{state.status === "ready" ? "稍后" : "关闭"}</Button>
          {actionLabel && (
            <Button type="button" disabled={installing} busy={installing} onClick={handleAction}>
              {installing && <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {actionLabel}
            </Button>
          )}
        </>
      )}
    >
      {publishedAt && <p className="text-sm text-muted-foreground">{publishedAt}</p>}
      <UpdateNotes markdown={notes.notes} />
      {statusLabel && <p role="status" aria-live="polite" className={`text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}>{statusLabel}</p>}
      {state.status === "downloading" && (
        <div role="progressbar" aria-label="更新下载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full bg-primary transition-[width] ${percent === undefined ? "w-1/3 animate-pulse" : ""}`} style={percent === undefined ? undefined : { width: `${percent}%` }} />
        </div>
      )}
    </DialogShell>
  );
}
