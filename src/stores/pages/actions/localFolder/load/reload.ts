import { readMarkdownFile } from "@/lib/local-folder-scanner/entries";
import {
  takeMarkdownReadHandoff,
  validateMarkdownRead,
} from "@/lib/local-folder-scanner/read-cache";
import type { StoreSet, StoreGet } from "../../hydrate";
import { useNotebooks } from "@/stores/useNotebooks";
import { pageWithParsedMarkdown } from "@/lib/local-folder-scanner/applyParsed";
import {
  parseLocalMarkdownContent,
  localFileTitleFromPath,
} from "@/lib/local-folder-scanner";
import {
  setLocalMdSnapshot,
  updateSnapshotStat,
} from "@/lib/local-md-snapshot";

export const reloadLocalPageFromDiskAction = async (
  set: StoreSet,
  get: StoreGet,
  pageId: string,
): Promise<void> => {
  if (typeof window === "undefined" || !window.gooseFs) return;

  const page = get().pages[pageId];
  if (!page || page.isFolder || page.trashedAt || !page.localFilePath) return;
  if (get().dirtyLocalPageIds[pageId]) return;

  const fs = window.gooseFs;
  const filePath = page.localFilePath;

  let read;
  try {
    const supplied = takeMarkdownReadHandoff(filePath);
    read =
      supplied && (await validateMarkdownRead(fs, filePath, supplied))
        ? supplied
        : await readMarkdownFile(fs, filePath);
  } catch (error) {
    console.error("[local-folder] reload read failed", error);
    return;
  }
  const markdown = read.content;
  const readError = read.error;

  const metadataRoot = page.localMetadataRoot ?? useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  const parsed = await parseLocalMarkdownContent(
    markdown,
    localFileTitleFromPath(filePath),
    readError,
    metadataRoot
      ? { root: metadataRoot, fs, filePath }
      : undefined,
  );

  if (read.stat && !(await validateMarkdownRead(fs, filePath, read, false)))
    return;

  const current = get().pages[pageId];
  if (
    !current ||
    current.trashedAt ||
    current.workspaceId !== page.workspaceId ||
    current.localFilePath !== filePath ||
    current !== page ||
    get().dirtyLocalPageIds[pageId]
  )
    return;

  let applied = false;
  set((state) => {
    const current = state.pages[pageId];
    if (
      !current ||
      current.trashedAt ||
      current.workspaceId !== page.workspaceId ||
      current.localFilePath !== filePath ||
      current !== page ||
      state.dirtyLocalPageIds[pageId]
    )
      return state;
    if (parsed.readState === "error") {
      return { pages: { ...state.pages, [pageId]: { ...current,
        localReadState: "error", localReadError: parsed.readError,
      } } };
    }
    if (parsed.metadataId !== page.localMetadataId && (parsed.metadataId || page.localMetadataId)) {
      return { pages: { ...state.pages, [pageId]: {
        ...current, localReadState: "error",
        localReadError: "磁盘笔记 ID 已改变，已保留当前内容；请重新扫描笔记本以确认身份",
      } } };
    }
    applied = true;
    return {
      pages: {
        ...state.pages,
        [pageId]: pageWithParsedMarkdown(current, parsed),
      },
    };
  });

  if (!applied) return;
  if (typeof markdown === "string") {
    setLocalMdSnapshot(filePath, markdown);
    if (read.stat) updateSnapshotStat(filePath, read.stat);
  }

  if (get().activePageId === pageId) {
    window.dispatchEvent(
      new CustomEvent("goose-note:reload-active-editor", {
        detail: { pageId },
      }),
    );
  }
};
