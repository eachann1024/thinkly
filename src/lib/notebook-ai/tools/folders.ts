import { tool } from "ai";
import { z } from "zod";
import type { Page } from "@/types";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
import { readDirectory, shouldIgnoreEntry } from "@/lib/local-folder-scanner/entries";
import { canReadFolderChildren, canReadNotebookResource, ensureNotebookReferenceIndex, isPageWithinResource, readableNotebookIds } from "../readResourceScope";
import type { NotebookAiAgentContext } from "../types";

export function enumerateFolderPages(pages: Record<string, Page>, notebookId: string, folderId: string | undefined, recursive: boolean) {
  return Object.values(pages).filter((page) => {
    if (page.trashedAt || page.workspaceId !== notebookId || page.id === folderId) return false;
    if (!folderId) return recursive || !page.parentId;
    if (!recursive) return page.parentId === folderId;
    return isPageWithinResource(page, { refId: "", notebookId, pageId: folderId, kind: "folder", title: "", relativePath: "", recursive }, pages);
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

async function diskCoverage(context: NotebookAiAgentContext, notebookId: string, folderId: string | undefined, recursive: boolean) {
  const notebook = useNotebooks.getState().notebooks[notebookId];
  if (notebook?.source !== "local-folder") return { complete: true, missingPaths: [] as string[], errors: [] as string[] };
  const pages = usePages.getState().pages;
  const basePath = folderId ? pages[folderId]?.localFilePath : notebook.localPath;
  if (!basePath || typeof window === "undefined" || !window.gooseFs) throw new Error("目录不可读取");
  const knownByPath = new Map(Object.values(pages).filter((page) => page.workspaceId === notebookId && !page.trashedAt).map((page) => [page.localFilePath, page]));
  const relative = (path: string) => path.slice(notebook.localPath!.length).replace(/^[\\/]+/, "");
  const hidden = new Set(useSettings.getState().localFolderHiddenFolders);
  const missingPaths: string[] = [];
  const errors: string[] = [];
  const visited = new Set<string>();
  async function walk(path: string) {
    if (visited.has(path)) return;
    visited.add(path);
    try {
      for (const entry of await readDirectory(window.gooseFs!, path)) {
        if (shouldIgnoreEntry(entry.name, hidden)) continue;
        const known = knownByPath.get(entry.path);
        if (known && !canReadNotebookResource(context, known)) continue;
        if (entry.isDirectory) {
          if (!known) missingPaths.push(relative(entry.path));
          if (recursive && known && canReadFolderChildren(context, notebookId, known.id)) await walk(entry.path);
        } else if (entry.isFile && /\.(md|markdown)$/i.test(entry.name) && !known) missingPaths.push(relative(entry.path));
      }
    } catch (error) { errors.push(`${relative(path) || "/"}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  await walk(basePath);
  return { complete: missingPaths.length === 0 && errors.length === 0, missingPaths, errors };
}

export const listFolder = tool({
  description: "按稳定身份分页枚举已选来源目录的 MD 和子目录；默认递归。仅枚举不等于已读正文，必须按需 readPage，coverage 不完整时不得宣称全部读完。根目录必须显式传 notebookId 且在读取范围内。",
  inputSchema: z.object({
    notebookId: z.string(), folderId: z.string().optional(),
    recursive: z.boolean().optional().default(true),
    cursor: z.string().optional(), limit: z.number().int().min(1).max(100).optional().default(50),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as NotebookAiAgentContext;
    const recursive = input.recursive ?? true;
    const limit = input.limit ?? 50;
    try {
      if (!readableNotebookIds(context).includes(input.notebookId)) throw new Error("笔记本不在本轮读取范围内");
      await ensureNotebookReferenceIndex(input.notebookId);
      const pages = usePages.getState().pages;
      const folder = input.folderId ? pages[input.folderId] : undefined;
      if (input.folderId && (!folder?.isFolder || folder.workspaceId !== input.notebookId || !canReadNotebookResource(context, folder))) throw new Error("目录不存在或不在本轮读取范围内");
      if (!input.folderId && context.resourceReferences && !context.resourceReferences.some((root) => root.notebookId === input.notebookId && root.kind === "notebook")) throw new Error("未选择此笔记本根目录，请指定已选目录");
      if (!canReadFolderChildren(context, input.notebookId, input.folderId)) throw new Error("目录子项未包含在本轮读取范围内");
      const entries = enumerateFolderPages(pages, input.notebookId, input.folderId, recursive).filter((page) => canReadNotebookResource(context, page));
      const key = fingerprint(JSON.stringify([input.notebookId, input.folderId, recursive, entries.map((page) => [page.id, page.parentId, page.localFilePath, page.updatedAt])]));
      const [cursorKey, rawOffset] = input.cursor?.split(":") ?? [key, "0"];
      const offset = Number(rawOffset);
      if (cursorKey !== key || !Number.isSafeInteger(offset) || offset < 0 || offset > entries.length) throw new Error("目录已变化或分页游标失效，请从第一页重新枚举");
      const end = Math.min(entries.length, offset + limit);
      const coverage = await diskCoverage(context, input.notebookId, input.folderId, recursive);
      return {
        notebookId: input.notebookId, folderId: input.folderId ?? null, recursive,
        entries: entries.slice(offset, end).map((page) => ({ notebookId: page.workspaceId, pageId: page.id, parentId: page.parentId ?? null, kind: page.isFolder ? "folder" : "page", title: getPageTitle(page), relativePath: getLocationSnapshot(page, useNotebooks.getState().notebooks, pages), readStatus: page.localReadState === "error" ? "error" : "not-read" })),
        total: entries.length, enumerated: end, loaded: 0, omitted: entries.filter((page) => !page.isFolder).length,
        nextCursor: end < entries.length ? `${key}:${end}` : null, coverage,
      };
    } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
  },
});
