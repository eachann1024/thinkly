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
  const busy = installing || state.status === "checking" || state.status === "downloading";
  const percent = updatePercent(state);
  const statusLabel = updateStatusLabel(state, installing, installError);
  const failed = Boolean(installError || state.status === "error" || (state.status === "ready" && state.message));
  const actionLabel = installing ? "正在重启…"
    : state.status === "ready" ? "重启并更新"
      : state.status === "checking" ? "检查中…"
        : state.status === "downloading" ? `下载中${percent === undefined ? "…" : ` · ${percent}%`}`
          : state.downloadPath ? "查看安装包"
            : state.status === "available" && state.downloadUrl ? "下载更新"
              : state.status === "error" ? "重试" : "检查更新";
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
      title="更新日志"
      contentClassName="max-h-[calc(100dvh-64px)] w-[calc(100%-32px)] sm:max-w-[560px]"
      bodyClassName="space-y-5"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>稍后</Button>
          <Button type="button" disabled={busy} busy={busy} onClick={handleAction}>
            {busy && <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </>
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium">鹅的笔记 v{notes.version}</h2>
        {publishedAt && <span className="text-sm text-muted-foreground">{publishedAt}</span>}
      </div>
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
