import { useLocale } from "@/i18n";
import { toast } from "@/components/ui/sonner";
import { describeDiskWriteError } from "@/lib/diskWriteError";
import {
  markMilestone,
  recordHistorySnapshotDetailed,
  unmarkMilestone,
} from "@/lib/history/snapshot";
import { historyRestoreTargetSignature, canApplyHistoryRestore } from "@/lib/history/restoreGuard";
import { materializeVersion } from "@/lib/history/restore";
import { createSafeHistoryContent } from "../historyViewPresentation";
import type { useHistoryViewState } from "./useHistoryViewState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/logic/useHistoryRestoreActions.tsx#messages:1">`
zh-Hans:
  thisVersionCouldNotBeRead: "无法读取该版本"
  noteChangedDuringRestore: "笔记在读取历史期间已变化，请重新还原。"
  theVersionFileIsEmptyOrUnreadableIf: "版本文件为空或无法读取。若仓库在云盘上，请先恢复云盘登录。"
  thisVersionHasAnInvalidFormatAndCannot: "该历史版本格式异常，无法还原"
  thisVersionHasDamagedMetadataAndCannotBe: "该历史版本头部属性损坏，无法还原"
  versionRestoredThePreviousContentWasSavedAs: "已还原至所选版本，原内容已保留为快照"
  milestoneMarkedThisVersionWillBeKeptIndefinitely: "已设为里程碑，该版本将长期保留"
  milestoneRemoved: "已取消里程碑"
  couldNotMarkMilestone: "标记失败"
  couldNotRemoveMilestone: "取消标记失败"
  confirmRestore: "确定还原到此历史版本？\\n当前正文会自动保留为「还原前快照」，可随时恢复。"
en:
  thisVersionCouldNotBeRead: "This version could not be read"
  noteChangedDuringRestore: "The note changed while loading history. Please restore again."
  theVersionFileIsEmptyOrUnreadableIf: "The version file is empty or unreadable. If your notebook is in cloud storage, sign in to it first."
  thisVersionHasAnInvalidFormatAndCannot: "This version has an invalid format and cannot be restored"
  thisVersionHasDamagedMetadataAndCannotBe: "This version has damaged metadata and cannot be restored"
  versionRestoredThePreviousContentWasSavedAs: "Version restored. The previous content was saved as a snapshot."
  milestoneMarkedThisVersionWillBeKeptIndefinitely: "Milestone marked. This version will be kept indefinitely."
  milestoneRemoved: "Milestone removed"
  couldNotMarkMilestone: "Could not mark milestone"
  couldNotRemoveMilestone: "Could not remove milestone"
  confirmRestore: "Restore this version?\\nThe current content will be saved as a snapshot that you can restore at any time."
ja:
  thisVersionCouldNotBeRead: "このバージョンを読み込めません"
  noteChangedDuringRestore: "履歴の読み込み中にノートが変更されました。もう一度復元してください。"
  theVersionFileIsEmptyOrUnreadableIf: "バージョンファイルが空か、読み込めません。リポジトリがクラウドストレージ上にある場合は、先にクラウドストレージへのサインインを復旧してください。"
  thisVersionHasAnInvalidFormatAndCannot: "この履歴バージョンの形式が正しくないため、復元できません"
  thisVersionHasDamagedMetadataAndCannotBe: "この履歴バージョンのヘッダー情報が破損しているため、復元できません"
  versionRestoredThePreviousContentWasSavedAs: "選択したバージョンに復元しました。元の内容はスナップショットとして保存されています"
  milestoneMarkedThisVersionWillBeKeptIndefinitely: "マイルストーンに設定しました。このバージョンは長期間保持されます"
  milestoneRemoved: "マイルストーンを解除しました"
  couldNotMarkMilestone: "マークに失敗しました"
  couldNotRemoveMilestone: "マークの解除に失敗しました"
  confirmRestore: "この履歴バージョンに復元しますか？\\n現在の本文は「復元前のスナップショット」として自動的に保持されるため、いつでも元に戻せます。"
`;
const t = createTranslator(messages);


export function useHistoryRestoreActions(
  input: ReturnType<typeof useHistoryViewState>,
) {
  useLocale();
  const {
    selectedVersionId,
    exit,
    bumpRefresh,
    getPage,
    updatePage,
    pageId,
    applyMilestone,
    isRestoring,
    setIsRestoring,
    pendingMilestoneVersionId,
    setPendingMilestoneVersionId,
  } = input;

  const handleRestore = () => {
    if (!pageId || !selectedVersionId || isRestoring) return;
    const current = getPage(pageId);
    if (!current) return;
    const ok = window.confirm(
      t("confirmRestore"),
    );
    if (!ok) return;
    setIsRestoring(true);

    try {
      flushEditorContent(true);
    } catch {
    }

    const latest = getPage(pageId);
    if (!latest) { setIsRestoring(false); return; }
    const targetSignature = historyRestoreTargetSignature(latest);

    recordHistorySnapshotDetailed({
      pageId,
      workspaceId: latest.workspaceId,
      content: latest.content,
      trigger: "pre-op",
    }).then((snapshot) => {
      if (snapshot.status === "unavailable") throw new Error(t("thisVersionCouldNotBeRead"));
      return materializeVersion(pageId, selectedVersionId);
    })
      .then((result) => {
        if (!canApplyHistoryRestore(targetSignature, getPage(pageId))) throw new Error(t("noteChangedDuringRestore"));
        if (!result || result.content == null) {
          toast.error(t("thisVersionCouldNotBeRead"), {
            description: t("theVersionFileIsEmptyOrUnreadableIf"),
          });
          setIsRestoring(false);
          return;
        }
        const safeContent = createSafeHistoryContent(result.content);
        if (!safeContent) {
          toast.error(t("thisVersionHasAnInvalidFormatAndCannot"));
          setIsRestoring(false);
          return;
        }
        const updates: Parameters<typeof updatePage>[1] = {
          content: safeContent,
        };
        if (latest.localFilePath || result.localFrontmatter !== undefined) {
          updates.localFrontmatter = result.localFrontmatter;
        }
        Object.assign(updates, result.settings);
        updatePage(pageId, updates, { recordActivity: false });
        toast.success(t("versionRestoredThePreviousContentWasSavedAs"));
        setIsRestoring(false);
        exit();
      })
      .catch((error) => {
        toast.error(t("thisVersionCouldNotBeRead"), {
          description: describeDiskWriteError(error),
        });
        setIsRestoring(false);
      });
  };

  const applyMilestoneLocally = (versionId: string, willBe: boolean) => {
    if (pageId) applyMilestone(pageId, versionId, willBe);
  };

  const handleToggleMilestone = (versionId: string, willBe: boolean) => {
    if (!pageId || pendingMilestoneVersionId) return;
    setPendingMilestoneVersionId(versionId);
    applyMilestoneLocally(versionId, willBe);
    const op = willBe
      ? markMilestone(pageId, versionId)
      : unmarkMilestone(pageId, versionId);
    op.then(() => {
      if (willBe) toast.success(t("milestoneMarkedThisVersionWillBeKeptIndefinitely"));
      else toast.success(t("milestoneRemoved"));
      bumpRefresh();
    })
      .catch((err) => {
        console.error(
          `[history] ${willBe ? "markMilestone" : "unmarkMilestone"} failed:`,
          err,
        );
        applyMilestoneLocally(versionId, !willBe);
        toast.error(willBe ? t("couldNotMarkMilestone") : t("couldNotRemoveMilestone"), {
          description: describeDiskWriteError(err),
        });
      })
      .finally(() => setPendingMilestoneVersionId(null));
  };
  return {
    ...input,
    handleRestore,
    applyMilestoneLocally,
    handleToggleMilestone,
  };
}
