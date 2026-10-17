import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitConflicts.tsx#localMessages:1">`
zh-Hans:
  couldNotReadConflictingContent_1b17: "无法读取冲突内容"
  loading_8b50: "读取中…"
  viewBothVersions_4142: "查看双方内容"
  aTextPreviewIsUnavailableFor_a7d3: "此文件无法显示文字预览，可以选择保留版本。"
  localContent_0cdc: "本地内容"
  remoteContent_2203: "远端内容"
  theFileWasDeletedInThis_c79b: "此版本已删除文件"
  onlyTheBeginningIsShownYour_1566: "内容过长，预览仅显示开头；选择会保留完整文件。"
  keepLocal_4f1d: "保留本地"
  keepLocalDeletion_e4fe: "按本地删除"
  keepRemote_7d5c: "保留远端"
  keepRemoteDeletion_1f51: "按远端删除"
  keepBoth_da3b: "保留两份"
  conflictCount: "有 {{count}} 个文件需要决定保留内容；处理完成后会继续同步。"
  localOverwrite: "保留本地将覆盖远端内容。"
  localDelete: "保留本地将删除远端文件。"
  remoteOverwrite: "保留远端将覆盖本地内容。"
  remoteDelete: "保留远端将删除本地文件。"
  keepBothDetails: "保留两份会另存远端版本。"
en:
  couldNotReadConflictingContent_1b17: "Could not read conflicting content"
  loading_8b50: "Loading…"
  viewBothVersions_4142: "View both versions"
  aTextPreviewIsUnavailableFor_a7d3: "A text preview is unavailable for this file. You can still choose which version to keep."
  localContent_0cdc: "Local content"
  remoteContent_2203: "Remote content"
  theFileWasDeletedInThis_c79b: "The file was deleted in this version"
  onlyTheBeginningIsShownYour_1566: "Only the beginning is shown. Your choice will preserve the complete file."
  keepLocal_4f1d: "Keep local"
  keepLocalDeletion_e4fe: "Keep local deletion"
  keepRemote_7d5c: "Keep remote"
  keepRemoteDeletion_1f51: "Keep remote deletion"
  keepBoth_da3b: "Keep both"
  conflictCount_one: "Choose which content to keep for {{count}} conflicting file. Sync will resume once it is resolved."
  conflictCount_other: "Choose which content to keep for {{count}} conflicting files. Sync will resume once they are resolved."
  localOverwrite: "Keeping local replaces the remote content."
  localDelete: "Keeping local deletes the remote file."
  remoteOverwrite: "Keeping remote replaces the local content."
  remoteDelete: "Keeping remote deletes the local file."
  keepBothDetails: "Keeping both saves the remote version as a separate file."
ja:
  couldNotReadConflictingContent_1b17: "競合する内容を読み込めませんでした"
  loading_8b50: "読み込み中…"
  viewBothVersions_4142: "両方の内容を表示"
  aTextPreviewIsUnavailableFor_a7d3: "このファイルはテキストプレビューを表示できません。保持するバージョンは選択できます。"
  localContent_0cdc: "ローカルの内容"
  remoteContent_2203: "リモートの内容"
  theFileWasDeletedInThis_c79b: "このバージョンではファイルが削除されています"
  onlyTheBeginningIsShownYour_1566: "内容が長いため、プレビューには冒頭のみ表示しています。選択するとファイル全体が保持されます。"
  keepLocal_4f1d: "ローカルを保持"
  keepLocalDeletion_e4fe: "ローカルの削除を保持"
  keepRemote_7d5c: "リモートを保持"
  keepRemoteDeletion_1f51: "リモートの削除を保持"
  keepBoth_da3b: "両方を保持"
  conflictCount: "{{count}} 件のファイルで、保持する内容を選択してください。完了すると同期を再開します。"
  localOverwrite: "ローカルを保持すると、リモートの内容が上書きされます。"
  localDelete: "ローカルを保持すると、リモートのファイルが削除されます。"
  remoteOverwrite: "リモートを保持すると、ローカルの内容が上書きされます。"
  remoteDelete: "リモートを保持すると、ローカルのファイルが削除されます。"
  keepBothDetails: "両方を保持すると、リモート版が別ファイルとして保存されます。"
`;
const uiText = createTranslator(localMessages);
import { localizeGitUiReason } from "./gitSyncUiState";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  GitSyncBridge,
  GitSyncConflict,
  GitSyncConflictDetail,
  GitConflictResolution,
} from "@/lib/git-sync-contract";

export function GitConflicts({
  repositoryId,
  conflicts,
  bridge,
  disabled,
  onResolve,
}: {
  repositoryId: string;
  conflicts: GitSyncConflict[];
  bridge: GitSyncBridge;
  disabled: boolean;
  onResolve: (request: GitConflictResolution) => void;
}) {
  useLocale();
  const [detail, setDetail] = useState<GitSyncConflictDetail | null>(null);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState<string | null | undefined>(undefined);
  async function inspect(conflictId: string) {
    setLoadingId(conflictId);
    setError(undefined);
    try {
      setDetail(await bridge.getConflict(repositoryId, conflictId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : null);
    } finally {
      setLoadingId("");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{uiText("conflictCount", { count: conflicts.length })}</p>
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-all text-sm">
              {conflict.folderName} / {conflict.path}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || Boolean(loadingId)}
              onClick={() => void inspect(conflict.id)}
            >
              {loadingId === conflict.id ? uiText("loading_8b50") : uiText("viewBothVersions_4142")}
            </Button>
          </div>
          {detail?.id === conflict.id && (
            <div className="space-y-3">
              {detail.binary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{uiText("aTextPreviewIsUnavailableFor_a7d3")}</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {(
                    [
                      [uiText("localContent_0cdc"), detail.localText],
                      [uiText("remoteContent_2203"), detail.remoteText],
                    ] as const
                  ).map(([label, content]) => (
                    <div key={label} className="min-w-0">
                      <p className="mb-1 text-xs font-medium">{label}</p>
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-2 text-xs">
                        {content ?? uiText("theFileWasDeletedInThis_c79b")}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              {detail.truncated && (
                <p className="text-sm leading-relaxed text-muted-foreground">{uiText("onlyTheBeginningIsShownYour_1566")}</p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {uiText(conflict.localExists ? "localOverwrite" : "localDelete")}{" "}
                {uiText(conflict.remoteExists ? "remoteOverwrite" : "remoteDelete")}{" "}
                {uiText("keepBothDetails")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["local", "remote", "both"] as const).map((choice) => (
                  <Button
                    key={choice}
                    size="sm"
                    variant="outline"
                    disabled={disabled || (choice === "both" && (!conflict.localExists || !conflict.remoteExists))}
                    onClick={() => {
                      setDetail(null);
                      onResolve({ repositoryId, conflictId: conflict.id, choice });
                    }}
                  >
                    {choice === "local"
                      ? conflict.localExists
                        ? uiText("keepLocal_4f1d")
                        : uiText("keepLocalDeletion_e4fe")
                      : choice === "remote"
                        ? conflict.remoteExists
                          ? uiText("keepRemote_7d5c")
                          : uiText("keepRemoteDeletion_1f51")
                        : uiText("keepBoth_da3b")}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {error !== undefined && (
        <p role="alert" className="text-sm text-danger">
          {error ? localizeGitUiReason(error) : uiText("couldNotReadConflictingContent_1b17")}
        </p>
      )}
    </div>
  );
}
