import type { StoreSet, StoreGet } from "../../hydrate";
import {
  deleteLocalMdSnapshot,
  setLocalMdSnapshot,
} from "@/lib/local-md-snapshot";
import { useTabs } from "../../../../useTabs";
import {
  localFileTitleFromPath,
  shouldIgnoreLocalRelativePath,
  parseLocalMarkdownContent,
} from "@/lib/local-folder-scanner";
import { canonicalRelativePath } from "@/lib/canonicalLocalPath";
import { useSettings } from "@/stores/useSettings";
import {
  readLocalPageIdMap,
  resolveOrCreateStableId,
  writeLocalPageIdMap,
} from "@/lib/local-page-idmap";
import { localPageMetadataCache } from "../../../persistence";
import type { Page } from "@/types";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";
import { portableHistoryIds } from "@/lib/history/notebookHistory";
import { clearHistoryTombstones, recordHistoryTombstones } from "@/lib/history/tombstones";

export const removeSingleLocalPageAction = (
  set: StoreSet,
  get: StoreGet,
  filePath: string,
): void => {
  const pages = get().pages;
  const target = Object.values(pages).find(
    (p) =>
      p.localFilePath === filePath ||
      p.localFilePath?.replace(/\\/g, "/") === filePath.replace(/\\/g, "/"),
  );
  if (!target) return;

  const pageId = target.id;

  deleteLocalMdSnapshot(filePath);

  if (!target.isFolder) recordHistoryTombstones(target.workspaceId, [pageId]);

  set((state) => {
    const newPages = { ...state.pages };
    delete newPages[pageId];

    const nextActivePageId =
      state.activePageId === pageId ? null : state.activePageId;

    const newDirty = { ...state.dirtyLocalPageIds };
    delete newDirty[pageId];

    return {
      pages: newPages,
      activePageId: nextActivePageId,
      dirtyLocalPageIds: newDirty,
    };
  });

  useTabs.getState().removeDeletedPage(pageId);
};

export const addSingleLocalPageAction = async (
  set: StoreSet,
  _get: StoreGet,
  notebookId: string,
  basePath: string,
  filePath: string,
  options?: { force?: boolean },
): Promise<void> => {
  if (typeof window === "undefined" || !window.gooseFs) return;

  const fs = window.gooseFs;

  if (!/\.(md|markdown)$/i.test(filePath)) return;

  const fallbackTitle = localFileTitleFromPath(filePath);
  const relativePath = canonicalRelativePath(basePath, filePath);
  if (!relativePath) return;
  if (
    !options?.force &&
    shouldIgnoreLocalRelativePath(
      relativePath,
      useSettings.getState().localFolderHiddenFolders,
    )
  ) {
    return;
  }
  const idMap = readLocalPageIdMap(notebookId);
  const historicalId = !idMap[relativePath] ? (await portableHistoryIds(basePath))[relativePath] : undefined;
  const adopted = historicalId && !Object.values(idMap).includes(historicalId);
  if (adopted) idMap[relativePath] = historicalId;
  const { id: pageId, dirty } = resolveOrCreateStableId(
    notebookId,
    relativePath,
    idMap,
  );
  if (dirty || adopted) {
    writeLocalPageIdMap(notebookId, idMap);
  }
  clearHistoryTombstones(notebookId, [pageId]);

  let markdown: string | null;
  let readError: string | undefined;
  try {
    if (fs.readFileStatAsync) {
      const result = await fs.readFileStatAsync(filePath);
      markdown = result.ok ? (result.content ?? "") : null;
      readError = result.error || undefined;
    } else if (fs.readFileStat) {
      const result = fs.readFileStat(filePath);
      markdown = result.ok ? (result.content ?? "") : null;
      readError = result.error || undefined;
    } else if (fs.readFileAsync) {
      markdown = await fs.readFileAsync(filePath);
    } else {
      markdown = fs.readFile(filePath);
    }
  } catch (err) {
    console.error("[local-folder] addSingleLocalPage read failed", err);
    return;
  }

  const parsed = await parseLocalMarkdownContent(
    markdown,
    fallbackTitle,
    readError,
  );

  if (typeof markdown === "string") {
    setLocalMdSnapshot(filePath, markdown);
  }

  const cachedMeta = localPageMetadataCache.get(pageId);

  const now = Date.now();
  const newPage: Page = {
    id: pageId,
    workspaceId: notebookId,
    content: parsed.content,
    isFolder: false,
    isLocked: parsed.isLocked,
    isPinned: parsed.isPinned || undefined,
    pinnedAt: parsed.isPinned ? (cachedMeta?.pinnedAt ?? now) : undefined,
    isFavorite: parsed.isFavorite || undefined,
    favoriteOrder: parsed.isFavorite ? cachedMeta?.favoriteOrder : undefined,
    fontSize: "default",
    fontFamily: parsed.fontFamily,
    pageLayout: parsed.pageLayout,
    localFilePath: filePath,
    localFrontmatter: parsed.frontmatter,
    localReadState: parsed.readState,
    localReadError: parsed.readError,
    createdAt: now,
    updatedAt: now,
    ...(cachedMeta?.icon && { icon: cachedMeta.icon }),
  };

  set((state) => ({
    pages: {
      ...state.pages,
      [pageId]: newPage,
    },
  }));

  appendLocalFolderOrderEntries(notebookId, [newPage]);
};
