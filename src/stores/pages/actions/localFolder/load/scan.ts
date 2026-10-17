import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/scan.ts#block1:1">`
zh-Hans:
  readFolderFailed: "无法读取本地文件夹"
en:
  readFolderFailed: "Couldn’t read the local folder."
`);
import type { StoreSet, StoreGet } from "../../hydrate";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { useNotebooks } from "../../../../useNotebooks";
import { localPageMetadataCache } from "../../../persistence";
import { scanLocalFolderPages } from "@/lib/local-folder-scanner";
import { latestLocalFolderLoadRequest } from "./tasks";
import { isNotebookRescanSuppressed } from "@/lib/local-folder-rescan-guard";
import type { Page } from "@/types";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";
import { recoverScannedLocalPages } from "./recovery";
import { clearHistoryTombstones, recordHistoryTombstones } from "@/lib/history/tombstones";
import "../../../../useTabs";

export const loadLocalFolderPagesOnce = async (
  set: StoreSet,
  get: StoreGet,
  notebookId: string,
  basePath: string,
  options: { showWelcome?: boolean; forceRead?: boolean } | undefined,
  hiddenFolders: string[],
  requestId: number,
  fingerprint: string,
) => {
  if (typeof window === "undefined" || !window.gooseFs) return;

  const isCurrentRequest = () =>
    latestLocalFolderLoadRequest.get(notebookId) === requestId &&
    useNotebooks.getState().notebooks[notebookId]?.localPath === basePath;
  if (isNotebookRescanSuppressed(notebookId) || !isCurrentRequest()) return;

  const previousActivePageId = get().activePageId;
  const previousActivePage = previousActivePageId
    ? get().pages[previousActivePageId]
    : undefined;
  const previousActiveInNotebook =
    previousActivePage?.workspaceId === notebookId
      ? previousActivePageId
      : null;
  const dirtyPageIdsAtLoadStart = new Set(
    Object.entries(get().dirtyLocalPageIds)
      .filter(([, dirty]) => dirty)
      .map(([pageId]) => pageId),
  );
  const contentSignaturesAtLoadStart = new Map(
    Object.values(get().pages)
      .filter((page) => page.workspaceId === notebookId)
      .map((page) => [page.id, getContentSignature(page.content)]),
  );
  useNotebooks.getState().dispatchLocalFolderLoadEvent(notebookId, {
    type: "started", requestId, fingerprint,
    startedAt: Date.now(),
  });

  const currentPages = get().pages;
  const hasExistingPages = Object.values(currentPages).some(
    (p) => p.workspaceId === notebookId,
  );

  if (hasExistingPages) {
    Object.values(currentPages).forEach((p) => {
      if (p.workspaceId === notebookId) {
        localPageMetadataCache.set(p.id, {
          isFavorite: p.isFavorite,
          favoriteOrder: p.favoriteOrder,
          icon: p.icon,
          isPinned: p.isPinned,
          pinnedAt: p.pinnedAt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
    });
  }

  try {
    const localPages = await scanLocalFolderPages({
      notebookId,
      basePath,
      gooseFs: window.gooseFs,
      hiddenFolders,
      forceRead: options?.forceRead,
    });

    // 同一记事本可能在启动恢复、点击切换和 watch 兜底中同时发起刷新。
    // 只允许最新请求提交，避免较慢的旧扫描反向覆盖新目录状态。
    if (isNotebookRescanSuppressed(notebookId) || !isCurrentRequest()) return;

    // 重扫发现缺失的笔记只记墓碑（历史延迟清理）；重新出现的清除墓碑。
    const scannedIds = new Set(localPages.map((page) => page.id));
    recordHistoryTombstones(notebookId, Object.values(currentPages)
      .filter((page) => page.workspaceId === notebookId && page.localFilePath && !page.isFolder && !scannedIds.has(page.id))
      .map((page) => page.id));
    clearHistoryTombstones(notebookId, localPages.filter((page) => !page.isFolder).map((page) => page.id));

    set((state) => {
      const pagesOutsideNotebook = Object.fromEntries(
        Object.entries(state.pages).filter(
          ([, page]) => page.workspaceId !== notebookId,
        ),
      );
      const unsavedInNotebook = Object.fromEntries(
        Object.entries(state.pages).filter(
          ([, page]) =>
            page.workspaceId === notebookId &&
            (page.editorDraft || (page.localUnsaved && !page.localFilePath)),
        ),
      );
      const updated = {
        ...pagesOutsideNotebook,
        ...localPages.reduce(
          (acc, page) => {
            const existing = localPageMetadataCache.get(page.id);
            const current = state.pages[page.id];
            if (existing) {
              // icon 等非 frontmatter 属性保留
              if (existing.icon) {
                page.icon = existing.icon;
              }
              // isPinned / isFavorite 以 frontmatter 为准；若 frontmatter 标为 pinned/favorite，可沿用现有时间戳或排序
              if (page.isPinned && existing.pinnedAt !== undefined) {
                page.pinnedAt = existing.pinnedAt;
              }
              if (page.isFavorite && existing.favoriteOrder !== undefined) {
                page.favoriteOrder = existing.favoriteOrder;
              }
              if (existing.createdAt !== undefined) {
                page.createdAt = existing.createdAt;
              }
              if (existing.updatedAt !== undefined) {
                page.updatedAt = existing.updatedAt;
              }
            }

            // 重扫不能覆盖仍在内存/写盘队列中的本地编辑。既保护扫描开始时
            // 已 dirty 的页，也保护扫描期间内容发生过变化、但写盘刚成功清掉
            // dirty 标记的页；同时采纳扫描得到的路径与父级元数据。
            const contentChangedDuringScan =
              current &&
              contentSignaturesAtLoadStart.get(page.id) !==
                getContentSignature(current.content);
            const preserveCurrent =
              current &&
              (dirtyPageIdsAtLoadStart.has(page.id) ||
                contentChangedDuringScan);
            acc[page.id] = preserveCurrent
              ? {
                  ...page,
                  ...current,
                  workspaceId: page.workspaceId,
                  parentId: page.parentId,
                  localFilePath: page.localFilePath,
                  localReadState: page.localReadState,
                  localReadError: page.localReadError,
                }
              : page;
            return acc;
          },
          {} as Record<string, Page>,
        ),
        ...unsavedInNotebook,
      };

      const { pendingNavigatePageId } = state;
      const result: any = { pages: updated };
      let nextActivePageId = state.activePageId;
      let handledNavigation = false;

      if (pendingNavigatePageId && updated[pendingNavigatePageId]) {
        nextActivePageId = pendingNavigatePageId;
        result.activePageId = nextActivePageId;
        result.expandPageId = nextActivePageId;
        result.pendingNavigatePageId = null;
        handledNavigation = true;
      }

      if (!handledNavigation) {
        const activeNotebookId = useNotebooks.getState().activeNotebookId;
        if (activeNotebookId === notebookId) {
          const notebook = useNotebooks.getState().notebooks[notebookId];
          const isLocalFolder = notebook?.source === "local-folder";

          if (isLocalFolder) {
            // 隐藏目录设置变化后，当前页可能已不在重扫结果里；不能保留悬空 activePageId。
            if (nextActivePageId && !updated[nextActivePageId]) {
              result.activePageId = null;
              result.expandPageId = null;
            }
          } else {
            const lastActivePageId = useNotebooks
              .getState()
              .getLastActivePage(notebookId);
            const pageIdSet = new Set(localPages.map((p) => p.id));

            if (lastActivePageId && pageIdSet.has(lastActivePageId)) {
              nextActivePageId = lastActivePageId;
            } else if (
              previousActiveInNotebook &&
              pageIdSet.has(previousActiveInNotebook)
            ) {
              nextActivePageId = previousActiveInNotebook;
            } else {
              const firstPage = localPages
                .filter((p) => !p.trashedAt)
                .sort(
                  (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
                )[0];
              if (firstPage) {
                nextActivePageId = firstPage.id;
              }
            }

            if (nextActivePageId !== state.activePageId) {
              result.activePageId = nextActivePageId;
            }
          }
        }
      }

      if (options?.showWelcome && !hasExistingPages) {
        // 打开/切换到本地文件夹时保持空白入口，不自动打开首篇。
        // 已缓存的文件夹复用上次活动页并后台刷新，不能在扫描完成后再把它
        // 清回空白，否则会重现一次完整界面闪烁。
        result.activePageId = null;
        result.expandPageId = null;
        result.pendingNavigatePageId = null;
      }

      const hasActivePageUpdate = Object.prototype.hasOwnProperty.call(
        result,
        "activePageId",
      );
      const currentActive = hasActivePageUpdate
        ? result.activePageId
        : state.activePageId;
      const activeNotebookId = useNotebooks.getState().activeNotebookId;
      if (activeNotebookId === notebookId && currentActive) {
        useNotebooks.getState().setLastActivePage(notebookId, currentActive);
      }
      return result;
    });

    // 扫描发现的条目（外部新增 / 移入）追加到所属手动顺序目录末尾。
    // 只追加不清理：隐藏目录 / 暂时读不到的文件不在 localPages 里，
    // 按扫描结果清扫会误删合法槽位（应用内移动的旧槽位由 move 路径清）。
    appendLocalFolderOrderEntries(notebookId, localPages);

    recoverScannedLocalPages(set, get, notebookId);
    useNotebooks.getState().dispatchLocalFolderLoadEvent(notebookId, {
      type: "succeeded", requestId, fingerprint,
      finishedAt: Date.now(),
    });
    // 该笔记本页面已就绪：清理指向已不存在文件的持久化标签。
    try {
      const { useTabs } = await import("../../../../useTabs");
      useTabs.getState().reconcileTabs();
    } catch {
      // ignore tabs reconcile error
    }
  } catch (error) {
    if (!isCurrentRequest()) return;
    const message =
      error instanceof Error && error.message
        ? error.message
        : storeText("readFolderFailed");
    useNotebooks.getState().dispatchLocalFolderLoadEvent(notebookId, {
      type: "failed", requestId, fingerprint,
      finishedAt: Date.now(),
      error: message,
    });
    throw error;
  }
};
