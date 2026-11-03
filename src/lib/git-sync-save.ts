import { toast } from "@/components/ui/sonner";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import {
  cloneJSONContent,
  getPendingLocalSaveContent,
  isRecoveredLocalSaveConfirmationRequired,
  queueLocalPageSave,
} from "@/stores/pages/folderSync";
import { describeDiskWriteError } from "./diskWriteError";
import { gitText } from "./git-messages";
import { openRecoveryDrafts } from "./recoveryDrafts";
import { recordRecoveryEntry } from "./storage/recoveryJournal";
import { recoverySettings } from "./storage/localRecoverySettings";
import { getContentDerivations } from "./reflection/contentDerivations";

export async function flushGitSyncPages(notebookIds: Set<string>): Promise<void> {
  const getPages = () => Object.values(usePages.getState().pages)
    .filter((page) => notebookIds.has(page.workspaceId) && !page.isFolder);
  const noticeId = `goose-git-sync-save:${[...notebookIds].sort().join(":")}`;
  const pages = getPages();
  const results = await Promise.allSettled(pages.map(async (page) => {
    await usePages.getState().flushPendingLocalSaveByPageId(page.id);
    const state = usePages.getState();
    const latest = state.pages[page.id];
    if (!latest || !notebookIds.has(latest.workspaceId) || latest.trashedAt ||
        !state.dirtyLocalPageIds[page.id] || isRecoveredLocalSaveConfirmationRequired(page.id)) return;

    // 空队列仍可能对应未落盘的内容；补入当前快照，只尝试一次。
    if (getPendingLocalSaveContent(page.id) === undefined) {
      const content = cloneJSONContent(latest.content);
      const entry = recordRecoveryEntry({
        source: "local-file",
        id: page.id,
        content,
        settings: recoverySettings(latest),
        baseSettings: recoverySettings(latest),
        baseSignature: () => getContentDerivations(content).recoverySignature,
        baseUpdatedAt: latest.updatedAt,
        draftPage: {
          ...latest, content, editorDraft: true, localFilePath: undefined, localUnsaved: true,
        },
      });
      if (!entry) throw new Error(gitText("saveBeforeSync"));
      queueLocalPageSave(page.id, content, usePages.getState, entry.revision);
    }
    await usePages.getState().flushPendingLocalSaveByPageId(page.id);
  }));
  const failedIndex = results.findIndex((result) => result.status === "rejected");
  const blocked = getPages().find((page) =>
    usePages.getState().dirtyLocalPageIds[page.id] ||
    isRecoveredLocalSaveConfirmationRequired(page.id) ||
    getPendingLocalSaveContent(page.id) !== undefined);
  const page = failedIndex >= 0 ? pages[failedIndex] : blocked;
  if (!page) {
    toast.dismiss(noticeId);
    return;
  }

  const message = gitText("saveBeforeSync");
  const result = results[failedIndex];
  const reason = result?.status === "rejected" ? describeDiskWriteError(result.reason) : message;
  toast.warning(message, {
    id: noticeId,
    duration: Infinity,
    description: `${page.localFilePath || getPageTitle(page)}\n${reason}`,
    action: {
      label: gitText("openUnsavedNote"),
      onClick: () => {
        const current = usePages.getState().pages[page.id];
        if (!current || current.trashedAt) {
          openRecoveryDrafts();
          return;
        }
        window.dispatchEvent(new CustomEvent("goose-note:request-close-settings"));
        useTabs.getState().openTab(page.id);
      },
    },
  });
  throw new Error(message);
}
