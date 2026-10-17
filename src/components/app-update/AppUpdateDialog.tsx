import { useLocale } from "@/i18n";
import { createTranslator, getFormatLocale, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/app-update/AppUpdateDialog.tsx#localMessages:1">`
zh-Hans:
  restarting: "正在重启…"
  restartUpdate: "重启并更新"
  showInstaller: "查看安装包"
  updateNow: "立即更新"
  releaseNotes: "v{{version}} 更新日志"
  downloadProgress: "更新下载进度"
en:
  restarting: "Restarting…"
  restartUpdate: "Restart and update"
  showInstaller: "Show installer"
  updateNow: "Update now"
  releaseNotes: "What’s new in v{{version}}"
  downloadProgress: "Update download progress"
`;
const uiText = createTranslator(localMessages);
import { DialogShell } from "@/components/ui/dialog-shell";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { selectUpdateNotes } from "./releaseNotes";
import { UpdateNotes } from "./UpdateNotes";
import { updatePercent, updateStatusLabel } from "./updatePresentation";

export function AppUpdateDialog() {
  useLocale();
  const { open, setOpen, currentVersion, state, installing, installError, download, install, revealDownload } = useAppUpdate();
  const notes = selectUpdateNotes(currentVersion, state);
  const percent = updatePercent(state);
  const statusLabel = state.status === "up-to-date" && !installError
    ? "" : updateStatusLabel(state, installing, installError);
  const failed = Boolean(installError || state.status === "error" || (state.status === "ready" && state.message));
  const actionLabel = installing ? uiText("restarting")
    : state.status === "ready" ? uiText("restartUpdate")
      : state.status === "checking" || state.status === "downloading" ? undefined
        : state.downloadPath ? uiText("showInstaller")
          : (state.status === "available" || state.status === "error") && state.downloadUrl && state.assetName ? uiText("updateNow")
            : undefined;
  const handleAction = () => {
    if (state.status === "ready") void install();
    else if (state.downloadPath) void revealDownload();
    else if (state.downloadUrl && state.assetName) void download();
  };
  const publishedAt = notes.publishedAt && !Number.isNaN(Date.parse(notes.publishedAt))
    ? new Date(notes.publishedAt).toLocaleDateString(getFormatLocale()) : "";

  return (
    <DialogShell
      open={open && hasNewAppUpdate(currentVersion, state)}
      onOpenChange={setOpen}
      title={uiText("releaseNotes", {version: notes.version})}
      contentClassName="max-h-[calc(100dvh-64px)] w-[calc(100%-32px)] sm:max-w-[560px]"
      bodyClassName="space-y-4"
      footer={actionLabel ? (
        <Button type="button" disabled={installing} busy={installing} onClick={handleAction}>
          {installing && <GooseIcons.Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {actionLabel}
        </Button>
      ) : undefined}
    >
      {publishedAt && <p className="text-sm text-muted-foreground">{publishedAt}</p>}
      <UpdateNotes markdown={notes.notes} />
      {statusLabel && <p role="status" aria-live="polite" className={`text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}>{statusLabel}</p>}
      {state.status === "downloading" && (
        <div role="progressbar" aria-label={uiText("downloadProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full bg-primary transition-[width] ${percent === undefined ? "w-1/3 animate-pulse" : ""}`} style={percent === undefined ? undefined : { width: `${percent}%` }} />
        </div>
      )}
    </DialogShell>
  );
}
