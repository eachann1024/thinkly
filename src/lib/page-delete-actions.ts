import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/page-delete-actions.ts#localMessages:1">`
zh-Hans:
  restoredChildren: "，并恢复 {{count}} 个子项"
  restoredItem: "已恢复{{kind}}「{{title}}」"
  restoredLocation: "位置：{{notebook}} / {{path}}{{children}}"
  confirmDelete: "彻底删除「{{title}}」？"
  deleting: "正在彻底删除「{{title}}」…"
  deleted: "已彻底删除「{{title}}」"
  deleteFailed: "无法彻底删除「{{title}}」"
  restored: "已恢复「{{title}}」"
  root: "顶层"
  note: "页面"
  untitled: "无标题"
  untitledNotebook: "未命名笔记本"
  thisWillPermanentlyDeleteTheItemAndAllIts: "删除后将连同全部子项一并移除，且无法恢复。"
  thisCanTBeUndone: "删除后无法恢复。"
  deletePermanently: "彻底删除"
  theNoteStillExists: "页面仍然存在"
  tryAgainLater: "请稍后重试。"
  theSystemTrashStillContainsACopyOfThe: "系统废纸篓仍保留原文件副本。"
  couldnTRestoreTheFileFromTheSystemTrash: "无法从废纸篓恢复文件"
  fileRestoredRefreshTheFolderToSeeIt: "文件已恢复，请刷新目录查看"
en:
  restoredChildren: "; child items restored: {{count}}"
  restoredItem: "Restored {{kind}} “{{title}}”"
  restoredLocation: "Location: {{notebook}} / {{path}}{{children}}"
  confirmDelete: "Permanently delete “{{title}}”?"
  deleting: "Permanently deleting “{{title}}”…"
  deleted: "Permanently deleted “{{title}}”"
  deleteFailed: "Couldn’t permanently delete “{{title}}”"
  restored: "Restored “{{title}}”"
  root: "Root"
  note: "Note"
  untitled: "Untitled"
  untitledNotebook: "Untitled notebook"
  thisWillPermanentlyDeleteTheItemAndAllIts: "This will permanently delete the item and all its contents. This can’t be undone."
  thisCanTBeUndone: "This can’t be undone."
  deletePermanently: "Delete permanently"
  theNoteStillExists: "The note still exists"
  tryAgainLater: "Try again later."
  theSystemTrashStillContainsACopyOfThe: "The system trash still contains a copy of the original file."
  couldnTRestoreTheFileFromTheSystemTrash: "Couldn’t restore the file from the system trash"
  fileRestoredRefreshTheFolderToSeeIt: "File restored. Refresh the folder to see it."
ja:
  restoredChildren: "。子項目 {{count}} 件も復元しました"
  restoredItem: "{{kind}}「{{title}}」を復元しました"
  restoredLocation: "場所：{{notebook}} / {{path}}{{children}}"
  confirmDelete: "「{{title}}」を完全に削除しますか？"
  deleting: "「{{title}}」を完全に削除しています…"
  deleted: "「{{title}}」を完全に削除しました"
  deleteFailed: "「{{title}}」を完全に削除できません"
  restored: "「{{title}}」を復元しました"
  root: "最上位"
  note: "ページ"
  untitled: "無題"
  untitledNotebook: "名称未設定のノートブック"
  thisWillPermanentlyDeleteTheItemAndAllIts: "削除すると、すべての子項目も一緒に削除され、元に戻せません。"
  thisCanTBeUndone: "削除すると元に戻せません。"
  deletePermanently: "完全に削除"
  theNoteStillExists: "ページはまだ存在します"
  tryAgainLater: "しばらくしてからもう一度お試しください。"
  theSystemTrashStillContainsACopyOfThe: "システムのゴミ箱に元のファイルのコピーが残っています。"
  couldnTRestoreTheFileFromTheSystemTrash: "ゴミ箱からファイルを復元できません"
  fileRestoredRefreshTheFolderToSeeIt: "ファイルを復元しました。フォルダを更新して確認してください"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { showDeleteReceipt } from "@/components/ui/delete-receipt";
import { consumeDeleteFailureMessage, describeDeleteFailure, rememberDeleteFailure } from "@/lib/delete-failure";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useTabs } from "@/stores/useTabs";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";

/**
 * 页面删除/恢复的唯一入口。
 * 所有调用点（侧栏右键菜单、页面菜单、快捷键、垃圾箱视图）共用这三个函数，
 * toast 统一走全局 Toaster 的 top-right 位置。
 */

/** 恢复页面并弹统一的成功 toast；reopenTab 用于撤回删除后重新打开标签页 */
export function restorePageWithToast(
  pageId: string,
  opts: { reopenTab?: boolean } = {},
) {
  const result = usePages.getState().restorePage(pageId);
  if (!result.ok) return;

  if (opts.reopenTab) {
    closeNotebookAiIfFullscreen();
    const tabsStore = useTabs.getState();
    const existingTab = tabsStore.openTabs.find((tab) => tab.pageId === pageId);
    if (existingTab) {
      tabsStore.setActiveTab(existingTab.id);
    } else if (tabsStore.activeTabId) {
      tabsStore.openInCurrentTab(pageId);
    } else {
      tabsStore.openTab(pageId);
    }
  }

  const parentPath =
    result.parentTitles && result.parentTitles.length > 0
      ? result.parentTitles.join(" / ")
      : uiText("root");
  const restoredChildrenCount = Math.max((result.restoredCount || 1) - 1, 0);
  const restoredChildrenText =
    restoredChildrenCount > 0 ? uiText("restoredChildren", {count: restoredChildrenCount}) : "";

  toast.success(
    uiText("restoredItem", {kind: result.itemLabel || uiText("note"), title: result.pageTitle || uiText("untitled")}),
    {
      description: uiText("restoredLocation", {notebook: result.notebookName || uiText("untitledNotebook"), path: parentPath, children: restoredChildrenText}),
    },
  );
}

const permanentDeleteInFlight = new Set<string>();

/** 永久删除（垃圾箱条目/本地文件）：先给出可读确认，再统一反馈执行结果。 */
export function permanentlyDeletePageWithCleanup(pageId: string) {
  const page = usePages.getState().pages[pageId];
  if (!page || permanentDeleteInFlight.has(pageId)) return;
  const title = getPageTitle(page) || uiText("untitled");
  const toastId = `permanent-delete:${pageId}`;

  toast.warning(uiText("confirmDelete", {title}), {
    id: toastId,
    duration: 8000,
    classNames: { actionButton: "goose-toast-action-danger" },
    description: page.isFolder
      ? uiText("thisWillPermanentlyDeleteTheItemAndAllIts")
      : uiText("thisCanTBeUndone"),
    action: {
      label: uiText("deletePermanently"),
      onClick: (event) => {
        event.preventDefault();
        if (permanentDeleteInFlight.has(pageId)) return;
        permanentDeleteInFlight.add(pageId);
        toast.loading(uiText("deleting", {title}), { id: toastId });
        void usePages
          .getState()
          .permanentlyDeletePage(pageId)
          .then(() => {
            if (usePages.getState().getPage(pageId)) {
              throw new Error(uiText("theNoteStillExists"));
            }
            useTabs.getState().removeDeletedPage(pageId);
            toast.success(uiText("deleted", {title}), { id: toastId });
          })
          .catch((error) => {
            console.error("[page-delete] permanently delete failed", error);
            toast.error(uiText("deleteFailed", {title}), {
              id: toastId,
              description: uiText("tryAgainLater"),
            });
          })
          .finally(() => {
            permanentDeleteInFlight.delete(pageId);
          });
      },
    },
  });
}

/** 删除页面：本地文件夹直接移入系统废纸篓（不弹确认），应用内页面进垃圾箱并支持撤回 */
export async function deletePageWithUndo(pageId: string) {
  const page = usePages.getState().pages[pageId];
  if (!page) return;
  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  const isLocalFolder = notebook?.source === "local-folder";
  const pageTitle = getPageTitle(page) || uiText("untitled");

  let deleted = false;
  let localTrashToken: string | undefined;
  try {
    deleted = await usePages.getState().deletePage(pageId, {
      onLocalTrash: (token) => { localTrashToken = token; },
    });
  } catch (error) {
    console.error("[page-delete] delete failed", error);
    rememberDeleteFailure(error);
  }
  if (!deleted) {
    if (!usePages.getState().pages[pageId]) return;
    showDeleteReceipt(
      [{
        title: pageTitle,
        deleted: false,
        reason: consumeDeleteFailureMessage() ?? describeDeleteFailure(new Error("trash-failed")),
      }],
      isLocalFolder,
    );
    return;
  }

  useTabs.getState().removeDeletedPage(pageId);

  showDeleteReceipt(
    [{ title: pageTitle, deleted: true }],
    isLocalFolder,
    isLocalFolder
      ? localTrashToken
        ? async () => {
            await undoLocalTrash(localTrashToken!, page.workspaceId);
            if (!page.isFolder && usePages.getState().getPage(pageId)) {
              closeNotebookAiIfFullscreen();
              useTabs.getState().openTab(pageId);
            }
            toast.success(uiText("restored", {title: pageTitle}), {
              description: uiText("theSystemTrashStillContainsACopyOfThe"),
            });
          }
        : undefined
      : () => restorePageWithToast(pageId, { reopenTab: true }),
  );
}

/** Restore only the exact item backed up for this deletion; never guess by filename. */
export async function undoLocalTrash(token: string, notebookId: string) {
  if (!(await window.gooseFs?.undoTrash?.(token))) throw new Error(uiText("couldnTRestoreTheFileFromTheSystemTrash"));
  const notebook = useNotebooks.getState().notebooks[notebookId];
  if (notebook?.localPath) {
    try {
      await usePages.getState().loadLocalFolderPages(notebookId, notebook.localPath);
    } catch (error) {
      console.warn("[page-delete] restored file but could not refresh sidebar", error);
      toast.warning(uiText("fileRestoredRefreshTheFolderToSeeIt"));
    }
  }
}
