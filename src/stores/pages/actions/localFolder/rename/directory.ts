import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/rename/directory.ts#block1:1">`
zh-Hans:
  fsUnavailable: "文件系统不可用"
  targetNotebookMissing: "目标笔记本不存在"
  pathChanged: "路径已发生变化，请重试"
  nameExists: "目标名称已存在"
  readStoppedFolderMove: "无法读取笔记，已停止移动目录"
  resourceRefsFailed: "资源引用更新失败"
  moveIncomplete: "移动未成功"
  moveRollbackPartial: "移动未完成，部分资源引用未能还原，请重新载入；正文仍在原位置"
  folderMissing: "目录不存在"
en:
  fsUnavailable: "The file system is unavailable."
  targetNotebookMissing: "The destination notebook does not exist."
  pathChanged: "The path has changed. Please try again."
  nameExists: "An item with that name already exists."
  readStoppedFolderMove: "The folder move stopped because a note couldn’t be read."
  resourceRefsFailed: "Couldn’t update the attachment references."
  moveIncomplete: "The move did not complete."
  moveRollbackPartial: "The move did not complete, and some attachment references couldn’t be restored. Please reload. The note content remains in its original location."
  folderMissing: "The folder does not exist."
ja:
  fsUnavailable: "ファイルシステムを利用できません"
  targetNotebookMissing: "移動先のノートブックが存在しません"
  pathChanged: "パスが変更されました。もう一度お試しください"
  nameExists: "移動先に同じ名前が既にあります"
  readStoppedFolderMove: "ノートを読み込めないため、フォルダの移動を中止しました"
  resourceRefsFailed: "リソース参照の更新に失敗しました"
  moveIncomplete: "移動できませんでした"
  moveRollbackPartial: "移動が完了せず、一部のリソース参照を元に戻せませんでした。再読み込みしてください。本文は元の場所にあります"
  folderMissing: "フォルダが存在しません"
`);
import { migrateNotebookHistory } from "@/lib/history/notebookHistory";
import {
  rebaseMarkdownResources,
  rebaseResourceContent,
} from "@/lib/local-resource-paths";
import {
  getLocalMdSnapshot,
  setLocalMdSnapshot,
  deleteLocalMdSnapshot,
} from "@/lib/local-md-snapshot";
import type { StoreSet, StoreGet } from "../../hydrate";
import { useNotebooks } from "../../../../useNotebooks";
import {
  flushPendingLocalSaveByPageIdInternal,
  acquireLocalPageFileOperation,
} from "../../../folderSync";
import { markSelfMoved } from "../move";
import {
  migrateLocalPageIdMapEntry,
  transferLocalPageIdMapTree,
  toRelativePath,
} from "@/lib/local-page-idmap";
import { persistPageSnapshots } from "../../../persistence";
import { withNotebookHistoryTransfer } from "@/lib/history/transfer";

export async function relocateLocalPageTree(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  nextPath: string,
  target?: { parentId: string | undefined; workspaceId?: string },
): Promise<string> {
  const page = get().pages[pageId];
  const fs = window.gooseFs;
  const basePath =
    useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  if (!fs || !basePath || !page.localFilePath)
    throw new Error(storeText("fsUnavailable"));
  const oldPath = page.localFilePath.replace(/\\/g, "/");
  const targetNotebookId = target?.workspaceId ?? page.workspaceId;
  const targetBasePath =
    useNotebooks.getState().notebooks[targetNotebookId]?.localPath;
  if (!targetBasePath) throw new Error(storeText("targetNotebookMissing"));
  const acrossNotebooks = targetNotebookId !== page.workspaceId;
  if (oldPath === nextPath) return pageId;
  const inside = (path: string) =>
    path === oldPath || path.startsWith(oldPath + "/");
  const nextFile = (path: string) =>
    inside(path) ? nextPath + path.slice(oldPath.length) : path;
  // Include notes outside the directory: they may reference assets being moved with it.
  const related = Object.values(get().pages)
    .filter((p) => p.workspaceId === page.workspaceId && p.localFilePath)
    .sort((a, b) => a.id.localeCompare(b.id));
  window.dispatchEvent(
    new CustomEvent("goose-note:flush-editor", { detail: { immediate: true } }),
  );
  for (const p of related)
    if (!p.isFolder) await flushPendingLocalSaveByPageIdInternal(p.id, get);
  const releases: Array<() => void> = [];
  try {
    for (const p of related)
      releases.push(await acquireLocalPageFileOperation(p.id));
    if (
      related.some((p) => get().pages[p.id]?.localFilePath !== p.localFilePath)
    )
      throw new Error(storeText("pathChanged"));
    if (await (fs.existsAsync ? fs.existsAsync(nextPath) : fs.exists(nextPath)))
      throw new Error(storeText("nameExists"));
    const moved = { from: oldPath, to: nextPath };
    const rewrites: Array<{
      id: string;
      before: string;
      after: string;
      path: string;
    }> = [];
    for (const p of related) {
      if (p.isFolder) continue;
      const path = p.localFilePath!.replace(/\\/g, "/");
      const before = await (fs.readFileAsync
        ? fs.readFileAsync(path)
        : fs.readFile(path));
      if (before === null) throw new Error(storeText("readStoppedFolderMove"));
      const after = rebaseMarkdownResources(
        before,
        path,
        nextFile(path),
        moved,
      );
      if (before !== after) rewrites.push({ id: p.id, before, after, path });
    }
    const written: typeof rewrites = [];
    const write = async (path: string, text: string) => {
      if (
        !(await (fs.writeFileAsync
          ? fs.writeFileAsync(path, text)
          : fs.writeFile(path, text)))
      )
        throw new Error(storeText("resourceRefsFailed"));
    };
    try {
      for (const entry of rewrites) {
        // Register before attempting a write so a thrown error also restores the original.
        written.push(entry);
        await write(entry.path, entry.after);
      }
      markSelfMoved(oldPath);
      markSelfMoved(nextPath);
      const rename = async () => {
        if (!(await fs.rename(oldPath, nextPath)))
          throw new Error(storeText("moveIncomplete"));
      };
      if (acrossNotebooks) {
        await withNotebookHistoryTransfer(
          basePath,
          targetBasePath,
          targetNotebookId,
          [
            {
              id: page.id,
              from: toRelativePath(basePath, oldPath),
              to: toRelativePath(targetBasePath, nextPath),
            },
            ...related
              .filter((p) => inside(p.localFilePath!))
              .map((p) => ({
                id: p.id,
                from: toRelativePath(basePath, p.localFilePath!),
                to: toRelativePath(targetBasePath, nextFile(p.localFilePath!)),
              })),
          ],
          rename,
        );
      } else await rename();
    } catch (error) {
      const restored = await Promise.allSettled(
        written.map((entry) => write(entry.path, entry.before)),
      );
      if (restored.some((result) => result.status === "rejected"))
        throw new Error(
          storeText("moveRollbackPartial"),
          { cause: error },
        );
      throw error;
    }
    markSelfMoved(oldPath);
    markSelfMoved(nextPath);
    set((state) => {
      const pages = { ...state.pages };
      for (const p of related) {
        const current = pages[p.id];
        if (!current) continue;
        const previous = p.localFilePath!.replace(/\\/g, "/"),
          next = nextFile(previous);
        pages[p.id] = {
          ...current,
          localFilePath: next,
          ...(acrossNotebooks && inside(previous)
            ? { workspaceId: targetNotebookId }
            : {}),
          content: p.isFolder
            ? current.content
            : rebaseResourceContent(current.content, previous, next, moved),
          ...(target && p.id === pageId ? { parentId: target.parentId } : {}),
        };
      }
      return { pages };
    });
    const movedPages = related.filter((p) =>
      inside(p.localFilePath!.replace(/\\/g, "/")),
    );
    if (acrossNotebooks) {
      transferLocalPageIdMapTree(
        page.workspaceId,
        targetNotebookId,
        toRelativePath(basePath, oldPath),
        toRelativePath(targetBasePath, nextPath),
        movedPages.map((p) => ({
          id: p.id,
          relativePath: toRelativePath(basePath, p.localFilePath!),
        })),
      );
      persistPageSnapshots(
        get().pages,
        movedPages.map((p) => p.id),
      );
    }
    for (const p of related) {
      const previous = p.localFilePath!.replace(/\\/g, "/"),
        next = nextFile(previous);
      const snapshot = getLocalMdSnapshot(previous);
      const rewritten = rewrites.find((entry) => entry.id === p.id);
      if (snapshot !== undefined || rewritten)
        setLocalMdSnapshot(next, rewritten?.after ?? snapshot!);
      if (previous !== next) {
        deleteLocalMdSnapshot(previous);
        if (!acrossNotebooks)
          migrateLocalPageIdMapEntry(
            page.workspaceId,
            toRelativePath(basePath, previous),
            toRelativePath(basePath, next),
            p.id,
          );
      }
    }
    if (!acrossNotebooks)
      await migrateNotebookHistory(
        basePath,
        Object.fromEntries(
          related
            .filter((p) => inside(p.localFilePath!.replace(/\\/g, "/")))
            .map((p) => [
              p.id,
              toRelativePath(
                basePath,
                nextFile(p.localFilePath!.replace(/\\/g, "/")),
              ),
            ]),
        ),
      );
    return pageId;
  } finally {
    releases.reverse().forEach((release) => release());
  }
}

export async function renameLocalDirectory(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  name: string,
): Promise<string> {
  const path = get().pages[pageId]?.localFilePath;
  if (!path) throw new Error(storeText("folderMissing"));
  const normalized = path.replace(/\\/g, "/");
  return relocateLocalPageTree(
    set,
    get,
    pageId,
    normalized.slice(0, normalized.lastIndexOf("/") + 1) + name,
  );
}
