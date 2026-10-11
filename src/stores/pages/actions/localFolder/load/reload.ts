import { readMarkdownFile } from "@/lib/local-folder-scanner/entries";
import {
  takeMarkdownReadHandoff,
  validateMarkdownRead,
} from "@/lib/local-folder-scanner/read-cache";
import type { StoreSet, StoreGet } from "../../hydrate";
import {
  parseLocalMarkdownContent,
  localFileTitleFromPath,
} from "@/lib/local-folder-scanner";
import {
  setLocalMdSnapshot,
  updateSnapshotStat,
} from "@/lib/local-md-snapshot";

// 外部进程修改了文件后，把磁盘内容重新读入 store（不触发脏标记 / 自动保存）。
// 若该文件有未保存的本地编辑（dirty）则跳过，避免覆盖用户输入。
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

  const parsed = await parseLocalMarkdownContent(
    markdown,
    localFileTitleFromPath(filePath),
    readError,
  );

  if (read.stat && !(await validateMarkdownRead(fs, filePath, read, false)))
    return;

  // Reading/parsing yields: don't overwrite edits, a move, or another reload.
  const current = get().pages[pageId];
  if (
    !current ||
    current.trashedAt ||
    current.workspaceId !== page.workspaceId ||
    current.localFilePath !== filePath ||
    current.content !== page.content ||
    get().dirtyLocalPageIds[pageId]
  )
    return;

  if (typeof markdown === "string") {
    setLocalMdSnapshot(filePath, markdown);
    if (read.stat) updateSnapshotStat(filePath, read.stat);
  }

  set((state) => {
    const current = state.pages[pageId];
    if (
      !current ||
      current.trashedAt ||
      current.workspaceId !== page.workspaceId ||
      current.localFilePath !== filePath ||
      current.content !== page.content ||
      state.dirtyLocalPageIds[pageId]
    )
      return state;
    return {
      pages: {
        ...state.pages,
        [pageId]: {
          ...current,
          content: parsed.content,
          localFrontmatter: parsed.frontmatter,
          fontFamily: parsed.fontFamily,
          pageLayout: parsed.pageLayout,
          isLocked: parsed.isLocked,
          localReadState: parsed.readState,
          localReadError: parsed.readError,
          updatedAt: Date.now(),
        },
      },
    };
  });

  // 当前正在编辑的文件被外部修改 → 通知编辑器重载内容。
  if (get().activePageId === pageId) {
    window.dispatchEvent(
      new CustomEvent("goose-note:reload-active-editor", {
        detail: { pageId },
      }),
    );
  }
};
