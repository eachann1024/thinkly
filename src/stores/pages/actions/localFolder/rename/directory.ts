import { migrateNotebookHistory } from "@/lib/history/localDisk";
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
  toRelativePath,
} from "@/lib/local-page-idmap";

export async function relocateLocalDirectory(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  nextPath: string,
  target?: { parentId: string | undefined },
): Promise<string> {
  const page = get().pages[pageId];
  const fs = window.gooseFs;
  const basePath =
    useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  if (!fs || !basePath || !page.localFilePath)
    throw new Error("文件系统不可用");
  const oldPath = page.localFilePath.replace(/\\/g, "/");
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
      throw new Error("路径已发生变化，请重试");
    if (await (fs.existsAsync ? fs.existsAsync(nextPath) : fs.exists(nextPath)))
      throw new Error("目标名称已存在");
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
      if (before === null) throw new Error("无法读取笔记，已停止移动目录");
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
        throw new Error("资源引用更新失败");
    };
    try {
      for (const entry of rewrites) {
        // Register before attempting a write so a thrown error also restores the original.
        written.push(entry);
        await write(entry.path, entry.after);
      }
      if (!(await fs.rename(oldPath, nextPath)))
        throw new Error("目录移动未成功");
    } catch (error) {
      const restored = await Promise.allSettled(
        written.map((entry) => write(entry.path, entry.before)),
      );
      if (restored.some((result) => result.status === "rejected"))
        throw new Error(
          "移动未完成，部分资源引用未能还原，请重新载入；正文仍在原位置",
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
          content: p.isFolder
            ? current.content
            : rebaseResourceContent(current.content, previous, next, moved),
          ...(target && p.id === pageId ? { parentId: target.parentId } : {}),
        };
      }
      return { pages };
    });
    for (const p of related) {
      const previous = p.localFilePath!.replace(/\\/g, "/"),
        next = nextFile(previous);
      const snapshot = getLocalMdSnapshot(previous);
      const rewritten = rewrites.find((entry) => entry.id === p.id);
      if (snapshot !== undefined || rewritten)
        setLocalMdSnapshot(next, rewritten?.after ?? snapshot!);
      if (previous !== next) {
        deleteLocalMdSnapshot(previous);
        migrateLocalPageIdMapEntry(
          page.workspaceId,
          toRelativePath(basePath, previous),
          toRelativePath(basePath, next),
          p.id,
        );
      }
    }
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
  if (!path) throw new Error("目录不存在");
  const normalized = path.replace(/\\/g, "/");
  return relocateLocalDirectory(
    set,
    get,
    pageId,
    normalized.slice(0, normalized.lastIndexOf("/") + 1) + name,
  );
}
