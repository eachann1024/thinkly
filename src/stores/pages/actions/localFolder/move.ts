import { runWithPresence } from "@/lib/ui/presence";
import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/move.ts#block1:1">`
zh-Hans:
  nameExists: "目标目录下已存在同名文件：{{name}}"
  moveFailed: "移动失败：{{reason}}"
en:
  nameExists: "A file named {{name}} already exists in the destination folder."
  moveFailed: "Move failed: {{reason}}"
ja:
  nameExists: "移動先に同名のファイルが既にあります：{{name}}"
  moveFailed: "移動に失敗しました：{{reason}}"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/move.ts#block2:2">`
zh-Hans:
  fsUnavailable: "文件系统不可用"
  pageUnavailable: "页面不存在或非本地文件夹页面"
  notebookMissing: "所属笔记本不存在"
  targetFolderMissing: "目标目录不存在"
  moveIntoSelf: "不能将目录移到自身的子目录内"
  readStoppedMove: "无法读取笔记，已停止移动"
  moveFailed: "移动操作未成功"
  writeResourceFailed: "资源路径写入失败"
  resourceMoved: "资源路径更新失败，笔记保留在新位置，请重新载入"
  resourceRolledBack: "资源路径更新失败，已恢复原笔记位置"
en:
  fsUnavailable: "The file system is unavailable."
  pageUnavailable: "The page does not exist or is not a local folder page."
  notebookMissing: "The notebook no longer exists."
  targetFolderMissing: "The destination folder does not exist."
  moveIntoSelf: "A folder can’t be moved into one of its own subfolders."
  readStoppedMove: "The move stopped because the note couldn’t be read."
  moveFailed: "The move did not complete."
  writeResourceFailed: "Couldn’t write the attachment paths."
  resourceMoved: "Attachment paths couldn’t be updated. The note remains in its new location. Please reload."
  resourceRolledBack: "Attachment paths couldn’t be updated. The note was moved back to its original location."
ja:
  fsUnavailable: "ファイルシステムを利用できません"
  pageUnavailable: "ページが存在しないか、ローカルフォルダのページではありません"
  notebookMissing: "所属するノートブックが存在しません"
  targetFolderMissing: "移動先のフォルダが存在しません"
  moveIntoSelf: "フォルダを自身のサブフォルダに移動することはできません"
  readStoppedMove: "ノートを読み込めないため、移動を中止しました"
  moveFailed: "移動できませんでした"
  writeResourceFailed: "リソースパスの書き込みに失敗しました"
  resourceMoved: "リソースパスの更新に失敗しました。ノートは新しい場所に保持されています。再読み込みしてください"
  resourceRolledBack: "リソースパスの更新に失敗したため、ノートを元の場所に戻しました"
`);
import {
  rebaseMarkdownResources,
  rebaseResourceContent,
} from "@/lib/local-resource-paths";
import { migrateNotebookHistory } from "@/lib/history/notebookHistory";
import { useNotebooks } from "../../../useNotebooks";
import {
  migrateLocalPageIdMapEntry,
  toRelativePath,
} from "@/lib/local-page-idmap";
import {
  getLocalMdSnapshot,
  setLocalMdSnapshot,
  deleteLocalMdSnapshot,
} from "@/lib/local-md-snapshot";
import {
  acquireLocalPageFileOperation,
  flushPendingLocalSaveByPageIdInternal,
} from "../../folderSync";
import { reassignLocalFolderOrder } from "@/stores/localFolderOrder";
import type { StoreSet, StoreGet } from "../hydrate";

const recentSelfMoved = new Map<string, number>();
const SELF_MOVE_WINDOW_MS = 5000;

export function markSelfMoved(absPath: string): void {
  recentSelfMoved.set(absPath, Date.now());
}

export function wasRecentlySelfMoved(absPath: string): boolean {
  const now = Date.now();
  for (const [key, ts] of recentSelfMoved) {
    if (now - ts > SELF_MOVE_WINDOW_MS) {
      recentSelfMoved.delete(key);
      continue;
    }
    if (absPath === key || absPath.startsWith(key + "/")) return true;
  }
  return false;
}

export async function moveLocalPageAction(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  targetFolderId: string | undefined,
): Promise<void> {
  if (typeof window === "undefined" || !window.gooseFs) {
    throw new Error(storeText("fsUnavailable"));
  }

  const page = get().pages[pageId];
  if (!page || !page.localFilePath) {
    throw new Error(storeText("pageUnavailable"));
  }

  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  if (!notebook?.localPath) {
    throw new Error(storeText("notebookMissing"));
  }

  let targetDirPath: string;
  if (targetFolderId === undefined) {
    targetDirPath = notebook.localPath;
  } else {
    const targetPage = get().pages[targetFolderId];
    if (!targetPage || !targetPage.isFolder || !targetPage.localFilePath) {
      throw new Error(storeText("targetFolderMissing"));
    }
    targetDirPath = targetPage.localFilePath;
  }

  const oldPath = page.localFilePath;

  const fileName = oldPath.replace(/\\/g, "/").split("/").pop()!;

  const oldDir = oldPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
  const normalizedTargetDir = targetDirPath.replace(/\\/g, "/");

  if (oldDir === normalizedTargetDir) return;

  if (page.isFolder) {
    const normalizedOld = oldPath.replace(/\\/g, "/");
    if (
      normalizedTargetDir === normalizedOld ||
      normalizedTargetDir.startsWith(normalizedOld + "/")
    ) {
      throw new Error(storeText("moveIntoSelf"));
    }
  }

  const newPath = `${normalizedTargetDir}/${fileName}`;

  const fs = window.gooseFs;

  const exists = (() => {
    try {
      return fs.exists?.(newPath) ?? false;
    } catch {
      return false;
    }
  })();
  if (exists) {
    throw new Error(extraText("nameExists", { name: fileName }));
  }

  if (page.isFolder) {
    const { relocateLocalPageTree } = await import("./rename/directory");
    await relocateLocalPageTree(set, get, pageId, newPath, {
      parentId: targetFolderId,
    });
    reassignLocalFolderOrder(
      page.workspaceId,
      pageId,
      page.parentId,
      targetFolderId,
    );
    return;
  }

  markSelfMoved(oldPath.replace(/\\/g, "/"));
  markSelfMoved(newPath);

  await flushPendingLocalSaveByPageIdInternal(pageId, get);

  const release = page.isFolder
    ? () => {}
    : await acquireLocalPageFileOperation(pageId);
  try {
    const markdown = page.isFolder
      ? null
      : await (fs.readFileAsync
          ? fs.readFileAsync(oldPath)
          : fs.readFile(oldPath));
    if (!page.isFolder && markdown === null)
      throw new Error(storeText("readStoppedMove"));
    const relocatedMarkdown =
      markdown === null
        ? null
        : rebaseMarkdownResources(markdown, oldPath, newPath);

    let renamed: boolean;
    try {
      renamed = Boolean(await Promise.resolve(fs.rename(oldPath, newPath)));
    } catch (err) {
      throw new Error(extraText("moveFailed", { reason: (err as Error).message ?? String(err) }), {
        cause: err,
      });
    }
    if (!renamed) {
      throw new Error(storeText("moveFailed"));
    }

    if (relocatedMarkdown !== null && relocatedMarkdown !== markdown) {
      try {
        const written = fs.writeFileAsync
          ? await fs.writeFileAsync(newPath, relocatedMarkdown)
          : await fs.writeFile(newPath, relocatedMarkdown);
        if (!written) throw new Error(storeText("writeResourceFailed"));
      } catch (error) {
        const restored = await (fs.writeFileAsync
          ? fs.writeFileAsync(newPath, markdown!)
          : fs.writeFile(newPath, markdown!));
        if (!restored || !(await fs.rename(newPath, oldPath)))
          throw new Error(storeText("resourceMoved"), {
            cause: error,
          });
        throw new Error(storeText("resourceRolledBack"), { cause: error });
      }
    }
    const basePath = notebook.localPath;

    if (!page.isFolder) {
      const snapshot = getLocalMdSnapshot(oldPath);
      if (snapshot !== undefined) {
        setLocalMdSnapshot(newPath, relocatedMarkdown ?? snapshot);
        deleteLocalMdSnapshot(oldPath);
      }

      const oldRel = toRelativePath(basePath, oldPath);
      const newRel = toRelativePath(basePath, newPath);
      migrateLocalPageIdMapEntry(page.workspaceId, oldRel, newRel, pageId);

      runWithPresence(() => set((state) => {
        const current = state.pages[pageId];
        if (!current) return state;
        return {
          pages: {
            ...state.pages,
            [pageId]: {
              ...current,
              localFilePath: newPath,
              content: rebaseResourceContent(current.content, oldPath, newPath),
              parentId: targetFolderId,
            },
          },
        };
      }));
    }

    const historyPaths = Object.fromEntries(
      Object.values(get().pages)
        .filter(
          (p) =>
            p.workspaceId === page.workspaceId &&
            p.localFilePath &&
            (p.localFilePath === newPath ||
              p.localFilePath.startsWith(newPath + "/")),
        )
        .map((p) => [p.id, toRelativePath(basePath, p.localFilePath!)]),
    );
    await migrateNotebookHistory(basePath, historyPaths);

    reassignLocalFolderOrder(
      page.workspaceId,
      pageId,
      page.parentId,
      targetFolderId,
    );
  } finally {
    release();
  }
}
