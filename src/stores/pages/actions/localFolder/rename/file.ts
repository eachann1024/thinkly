import { isStandaloneFile } from "@/lib/standaloneFileCapabilities";
import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/rename/file.ts#block1:1">`
zh-Hans:
  renameFailed: "重命名失败：{{reason}}"
en:
  renameFailed: "Rename failed: {{reason}}"
ja:
  renameFailed: "名前を変更できませんでした：{{reason}}"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/rename/file.ts#block2:2">`
zh-Hans:
  pageUnavailable: "页面不存在或非本地文件夹页面"
  invalidName: "名称不能包含路径分隔符或非法字符"
  emptyName: "文件名不能为空"
  fsUnavailable: "文件系统不可用"
  renamePathChanged: "路径已发生变化，请重新命名"
  renameFailed: "重命名操作未成功"
en:
  pageUnavailable: "The page does not exist or is not a local folder page."
  invalidName: "Names can’t contain path separators or invalid characters."
  emptyName: "The filename can’t be empty."
  fsUnavailable: "The file system is unavailable."
  renamePathChanged: "The path has changed. Rename the file again."
  renameFailed: "The rename did not complete."
ja:
  pageUnavailable: "ページが存在しないか、ローカルフォルダのページではありません"
  invalidName: "名前にパス区切り文字や使用できない文字を含めることはできません"
  emptyName: "ファイル名を空にすることはできません"
  fsUnavailable: "ファイルシステムを利用できません"
  renamePathChanged: "パスが変更されました。もう一度名前を変更してください"
  renameFailed: "名前を変更できませんでした"
`);
import { migrateNotebookHistory } from "@/lib/history/notebookHistory";
import type { StoreSet, StoreGet } from "../../hydrate";
import {
  sanitizeFilenameSegment,
  splitFilePath,
} from "@/lib/local-title-binding";
import { renameLocalDirectory } from "./directory";
import { allocateUniqueLocalBaseName } from "../pathGuards";
import {
  flushPendingLocalSaveByPageIdInternal,
  acquireLocalPageFileOperation,
} from "../../../folderSync";
import { markSelfMoved } from "../move";
import { useNotebooks } from "../../../../useNotebooks";
import {
  toRelativePath,
  migrateLocalPageIdMapEntry,
} from "@/lib/local-page-idmap";

export async function renameLocalPageFileAction(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  newBaseName: string,
): Promise<string> {
  const page = get().pages[pageId];
  if (!page || !page.localFilePath || isStandaloneFile(page)) {
    throw new Error(storeText("pageUnavailable"));
  }

  if (
    // eslint-disable-next-line no-control-regex
    /[\\/:*?"<>|\x00-\x1f\x7f]/.test(newBaseName) ||
    /^\.+$/.test(newBaseName.trim())
  ) {
    throw new Error(storeText("invalidName"));
  }
  const located = splitFilePath(page.localFilePath);
  const sanitized = sanitizeFilenameSegment(
    newBaseName,
    page.isFolder ? "" : ` (99)${located.ext}`,
  );
  if (!sanitized) {
    throw new Error(storeText("emptyName"));
  }

  if (page.isFolder) return renameLocalDirectory(set, get, pageId, sanitized);

  const { dir, base, ext } = located;
  if (sanitized === base) {
    return pageId;
  }

  if (typeof window === "undefined" || !window.gooseFs) {
    throw new Error(storeText("fsUnavailable"));
  }

  const fs = window.gooseFs;
  const uniqueBase = await allocateUniqueLocalBaseName(
    fs,
    get().pages,
    pageId,
    dir,
    sanitized,
    ext,
    page.localFilePath,
  );
  const nextFilePath = `${dir}/${uniqueBase}${ext}`;
  if (uniqueBase === base) {
    return pageId;
  }

  window.dispatchEvent(
    new CustomEvent("goose-note:flush-editor", {
      detail: { immediate: true, pageId },
    }),
  );
  await flushPendingLocalSaveByPageIdInternal(pageId, get);

  const releaseFileOperation = await acquireLocalPageFileOperation(pageId);
  try {
    if (get().pages[pageId]?.localFilePath !== page.localFilePath) {
      throw new Error(storeText("renamePathChanged"));
    }
    const renamed = Boolean(
      await Promise.resolve(fs.rename(page.localFilePath, nextFilePath)),
    );
    if (!renamed) {
      throw new Error(storeText("renameFailed"));
    }

    markSelfMoved(page.localFilePath.replace(/\\/g, "/"));
    markSelfMoved(nextFilePath.replace(/\\/g, "/"));

    set((state) => {
      const current = state.pages[pageId];
      if (!current) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...current, localFilePath: nextFilePath },
        },
      };
    });

    const { getLocalMdSnapshot, setLocalMdSnapshot, deleteLocalMdSnapshot } =
      await import("@/lib/local-md-snapshot");
    const oldSnapshot = getLocalMdSnapshot(page.localFilePath);
    if (oldSnapshot !== undefined) {
      setLocalMdSnapshot(nextFilePath, oldSnapshot);
      deleteLocalMdSnapshot(page.localFilePath);
    }

    const notebook = useNotebooks.getState().notebooks[page.workspaceId];
    const basePath = notebook?.localPath || "";
    const oldRelativePath = toRelativePath(basePath, page.localFilePath);
    const newRelativePath = toRelativePath(basePath, nextFilePath);
    migrateLocalPageIdMapEntry(
      page.workspaceId,
      oldRelativePath,
      newRelativePath,
      pageId,
    );

    if (basePath) await migrateNotebookHistory(basePath, { [pageId]: newRelativePath });
    return pageId;
  } catch (error) {
    if (error instanceof Error && error.message === storeText("renameFailed")) {
      throw error;
    }
    throw new Error(
      extraText("renameFailed", { reason: error instanceof Error ? error.message : String(error) }),
      { cause: error },
    );
  } finally {
    releaseFileOperation();
  }
}
