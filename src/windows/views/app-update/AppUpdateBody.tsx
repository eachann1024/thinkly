import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/ui/icons";
import { UpdateNotes } from "@/components/app-update/UpdateNotes";
import { selectUpdateNotes } from "@/components/app-update/releaseNotes";
import { updatePercent } from "@/components/app-update/updatePresentation";
import { useLocale, getFormatLocale, i18nYaml, createTranslator } from "@/i18n";
import { useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { useAppUpdateWindow } from "./useAppUpdateWindow";

const text = createTranslator(i18nYaml<"src/windows/views/app-update/AppUpdateBody.tsx#block1:1">`
zh-Hans:
  releaseNotes: "v{{version}} 更新日志"
  updateNow: "立即更新"
  downloading: "正在下载"
  restartUpdate: "重启并更新"
  restarting: "正在重启…"
  showInstaller: "查看安装包"
  progress: "更新下载进度"
  downloaded: "已下载 {{percent}}%"
  downloadComplete: "下载完成"
  keepDownloading: "关掉窗口也会在后台继续下载"
  restartHint: "重启 Thinkly 即完成更新"
  currentVersion: "当前版本 v{{version}}"
  noNotes: "这次更新没有更新日志。"
en:
  releaseNotes: "What’s new in v{{version}}"
  updateNow: "Update now"
  downloading: "Downloading"
  restartUpdate: "Restart and update"
  restarting: "Restarting…"
  showInstaller: "Show installer"
  progress: "Update download progress"
  downloaded: "{{percent}}% downloaded"
  downloadComplete: "Download complete"
  keepDownloading: "Closing this window keeps the download running"
  restartHint: "Restart Thinkly to finish the update"
  currentVersion: "Current version v{{version}}"
  noNotes: "This update has no release notes."
ja:
  releaseNotes: "v{{version}} のリリースノート"
  updateNow: "今すぐアップデート"
  downloading: "ダウンロード中"
  restartUpdate: "再起動してアップデート"
  restarting: "再起動中…"
  showInstaller: "インストーラを表示"
  progress: "アップデートのダウンロード進捗"
  downloaded: "{{percent}}% ダウンロード済み"
  downloadComplete: "ダウンロード完了"
  keepDownloading: "ウィンドウを閉じてもダウンロードは続きます"
  restartHint: "Thinkly を再起動するとアップデートが完了します"
  currentVersion: "現在のバージョン v{{version}}"
  noNotes: "このアップデートにリリースノートはありません。"
`);

export function AppUpdateBody() {
  useLocale();
  const windowState = useAuxiliaryWindow();
  const update = useAppUpdateWindow();
  const notes = selectUpdateNotes(update.currentVersion, update.state);
  const percent = updatePercent(update.state);
  const downloading = update.state.status === "downloading";
  const ready = update.state.status === "ready";
  const showProgress = downloading || ready;
  const canDownload = Boolean(update.state.downloadUrl && update.state.assetName);
  const label = update.installing ? text("restarting")
    : ready ? text("restartUpdate")
      : downloading ? text("downloading")
        : update.state.downloadPath ? text("showInstaller")
          : canDownload ? text("updateNow")
            : undefined;
  const hint = downloading ? text("keepDownloading")
    : ready ? text("restartHint")
      : text("currentVersion", { version: update.currentVersion });
  const published = notes.publishedAt && !Number.isNaN(Date.parse(notes.publishedAt))
    ? new Date(notes.publishedAt).toLocaleDateString(getFormatLocale()) : "";
  const failed = Boolean(update.installError || update.state.status === "error");
  const run = () => {
    if (ready) update.install();
    else if (update.state.downloadPath) update.reveal();
    else if (canDownload) update.download();
  };

  return (
    <StandaloneWindowShell
      title={text("releaseNotes", { version: notes.version })}
      context={published || undefined}
      maximizable={windowState.resizable}
      inset={false}
    >
      <div className="flex min-h-0 flex-1 px-2 pb-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            {notes.notes ? <UpdateNotes markdown={notes.notes} /> : <p className="text-[13px] text-muted-foreground">{text("noNotes")}</p>}
          </div>
          <footer className="flex shrink-0 flex-col gap-2.5 border-t border-border px-4 py-3.5">
            {showProgress ? (
              <div className="flex flex-col gap-1.5">
                <div role="progressbar" aria-label={text("progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? 0} className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${percent ?? (ready ? 100 : 0)}%` }} />
                </div>
                <span role="status" aria-live="polite" className="goose-tabular text-xs text-muted-foreground">
                  {ready ? text("downloadComplete") : text("downloaded", { percent: percent ?? 0 })}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}>{update.installError || update.state.message || hint}</span>
              {label ? (
                <Button type="button" size="sm" className="min-w-28" disabled={update.installing || downloading} busy={update.installing || downloading} onClick={run}>
                  {(update.installing || downloading) ? <Loader2 aria-hidden="true" className="size-3 animate-spin" /> : null}
                  {label}
                </Button>
              ) : null}
            </div>
          </footer>
        </div>
      </div>
    </StandaloneWindowShell>
  );
}
