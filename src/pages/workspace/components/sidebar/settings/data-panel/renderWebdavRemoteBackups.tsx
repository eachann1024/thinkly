import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/renderWebdavRemoteBackups.tsx#localMessages:1">`
zh-Hans:
  remoteBackups_4419: "远端备份"
  loadingRemoteBackups_8208: "正在加载远端备份"
  noRemoteBackups_5d1a: "暂无远端备份"
  time_14e6: "时间："
  size_19e5: "大小："
  restore_c7db: "恢复"
  delete_2f4a: "删除"
  showFewerBackups_2fbc: "收起备份"
  showAllBackups: "展开全部远端备份 (还有 {{count}} 个)"
en:
  remoteBackups_4419: "Remote backups"
  loadingRemoteBackups_8208: "Loading remote backups"
  noRemoteBackups_5d1a: "No remote backups"
  time_14e6: "Time:"
  size_19e5: "Size:"
  restore_c7db: "Restore"
  delete_2f4a: "Delete"
  showFewerBackups_2fbc: "Show fewer backups"
  showAllBackups: "Show all remote backups ({{count}} more)"
ja:
  remoteBackups_4419: "リモートバックアップ"
  loadingRemoteBackups_8208: "リモートバックアップを読み込んでいます"
  noRemoteBackups_5d1a: "リモートバックアップはありません"
  time_14e6: "日時:"
  size_19e5: "サイズ:"
  restore_c7db: "復元"
  delete_2f4a: "削除"
  showFewerBackups_2fbc: "バックアップを折りたたむ"
  showAllBackups: "すべてのリモートバックアップを表示 (他 {{count}} 件)"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  ChevronRight,
  Trash2,
} from "@/components/ui/icons";
import { SkeletonList } from "@/components/ui/skeleton";
import { DotDecor, SettingsDotIcon } from "@/components/ui/dot-matrix";
import { SettingsSectionCard } from "../SettingsSectionCard";
import type { useWebdavRemoteActions } from "./useWebdavRemoteActions";
import { formatFileSize, formatRemoteTime } from "./shared";

export function renderWebdavRemoteBackups(
  context: ReturnType<typeof useWebdavRemoteActions>,
) {
  const {
    remoteLoading,
    isRemoteListOpen,
    showAllRemote,
    setShowAllRemote,
    remoteFiles,
    restoringFile,
    deletingFile,
    busy,
    hasSavedConfig,
    fetchRemoteList,
    toggleRemoteList,
    handleRestore,
    handleDelete,
    visibleRemoteFiles,
  } = context;
  return (
    <SettingsSectionCard
      className="pt-3"
      title={
        <Button contentStyle="preserve" variant="ghost" size="sm"
          type="button"
          className="h-auto whitespace-normal border-0 px-0 py-0 flex items-center gap-2 text-left "
          onClick={toggleRemoteList}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isRemoteListOpen && "rotate-90",
            )}
          />
          <span>{uiText("remoteBackups_4419")}</span>
        </Button>
      }
      actions={
        isRemoteListOpen && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || !hasSavedConfig}
            onClick={() => void fetchRemoteList()}
            className="h-8 rounded-[var(--goose-control-radius)] px-2 text-xs hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", remoteLoading && "animate-spin")}
            />
          </Button>
        )
      }
    >
      {isRemoteListOpen && (
        <div className="space-y-3 pt-2">
          {remoteLoading ? (
            <SkeletonList rows={3} icon={false} label={uiText("loadingRemoteBackups_8208")} />
          ) : remoteFiles.length === 0 ? (
            <div className="relative flex flex-col items-center gap-2.5 overflow-hidden border border-dashed rounded-[var(--goose-control-radius)] border-muted py-10 text-center">
              <DotDecor preset="webdav" compact />
              <SettingsDotIcon name="cloudOff" size={40} className="relative" />
              <p className="relative text-sm font-medium text-foreground">
                {uiText("noRemoteBackups_5d1a")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleRemoteFiles.map((file) => {
                const isRestoring = restoringFile === file.basename;
                const isDeleting = deletingFile === file.basename;
                return (
                  <div
                    key={file.basename}
                    className="flex flex-col gap-2 rounded-[var(--goose-control-radius)] border p-3 bg-[hsl(var(--goose-selected-bg)/0.38)] dark:bg-[hsl(var(--foreground)/0.04)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p
                        className="text-sm font-medium truncate max-w-[280px] sm:max-w-[400px]"
                        title={file.basename}
                      >
                        {file.basename}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{uiText("time_14e6")}{formatRemoteTime(file.lastmod)}</span>
                        <span>{uiText("size_19e5")}{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 rounded-[var(--goose-control-radius)] text-sm flex items-center gap-1"
                        disabled={busy}
                        onClick={() => handleRestore(file)}
                      >
                        {isRestoring ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {uiText("restore_c7db")}</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 rounded-[var(--goose-control-radius)] text-sm flex items-center gap-1"
                        disabled={busy}
                        onClick={() => handleDelete(file)}
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        {uiText("delete_2f4a")}</Button>
                    </div>
                  </div>
                );
              })}

              {remoteFiles.length > 3 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllRemote((prev) => !prev)}
                    className="text-sm hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
                  >
                    {showAllRemote
                      ? uiText("showFewerBackups_2fbc")
                      : uiText("showAllBackups", { count: remoteFiles.length - 3 })}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </SettingsSectionCard>
  );
}
