import { tool } from "ai";
import { z } from "zod";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getContentDerivationsForPage } from "@/components/editor/utils/content-page-derivations-cache";
import { blocksToMarkdown } from "@/lib/export/blocknoteSerializer";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { NotebookAiAgentContext } from "../types";

import { canReadNotebookResource, readableNotebookIds, ensureNotebookReferenceIndex } from "../readResourceScope";
import { getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
export { listFolder } from "./folders";

function canAccessNotebook(context: NotebookAiAgentContext, notebookId: string) {
  return readableNotebookIds(context).includes(notebookId);
}

export const listNotebooks = tool({
  description: "返回所有已连接笔记本及稳定身份，可跨笔记本读取和定位操作目标。",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const context = experimental_context as NotebookAiAgentContext;
    const notebooks = useNotebooks.getState().notebooks;
    return readableNotebookIds(context).map((id) => notebooks[id]).filter(Boolean).map((notebook) => ({ id: notebook.id, name: notebook.name, isCurrent: notebook.id === context.notebookId }));
  },
});

export const listPages = tool({
  description:
    "列出指定笔记本（默认为当前绑定笔记本）中所有未删除的页面，返回页面 id、标题和最近更新时间。",
  inputSchema: z.object({
    notebookId: z
      .string()
      .optional()
      .describe("指定笔记本 id；省略则使用当前绑定笔记本"),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as NotebookAiAgentContext;
    const targetId = input.notebookId ?? context.notebookId;
    if (!canAccessNotebook(context, targetId)) {
      return { error: "笔记本不存在或已卸载" };
    }
    try { await ensureNotebookReferenceIndex(targetId); }
    catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
    const pages = usePages.getState().pages;
    return Object.values(pages)
      .filter((p) => canReadNotebookResource(context, p) && p.workspaceId === targetId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((p) => ({
        pageId: p.id,
        title: getPageTitle(p),
        notebookId: p.workspaceId,
        relativePath: getLocationSnapshot(p, useNotebooks.getState().notebooks, pages),
        parentId: p.parentId,
        isFolder: !!p.isFolder,
        updatedAt: p.updatedAt,
      }));
  },
});

export const searchNotes = tool({
  description:
    "在所有已连接笔记本中全文搜索，可用 notebookId 限定目标。仅用于跨页面查找或目标页面不明确的任务；已知页面直接 readPage。返回匹配页面和命中片段。",
  inputSchema: z.object({
    query: z.string().optional().default("").describe("搜索关键词"),
    notebookId: z.string().optional().describe("仅搜索指定笔记本；省略则搜索所有笔记本"),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as NotebookAiAgentContext;
    const query = input.query.trim();
    if (!query) return [];

    const ids = input.notebookId ? [input.notebookId] : readableNotebookIds(context);
    const errors: string[] = [];
    const loaded = new Set<string>();
    for (const id of ids) {
      try {
        await ensureNotebookReferenceIndex(id);
        loaded.add(id);
        if (Object.values(usePages.getState().pages).some((page) =>
          page.workspaceId === id && !page.trashedAt && page.localReadState === "error")) break;
      }
      catch (error) {
        errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }
    const pages = usePages.getState().pages;
    const notebooks = useNotebooks.getState().notebooks;
    const queryLower = query.toLowerCase();

    const queryTerms = queryLower
      .split(/[\s,，。、？！?!]+/)
      .filter((t) => t.length >= 2);

    function scoreText(rawText: string): { score: number; matchIdx: number } {
      const lower = rawText.toLowerCase();
      let score = 0;
      let matchIdx = -1;

      let searchFrom = 0;
      while (true) {
        const idx = lower.indexOf(queryLower, searchFrom);
        if (idx === -1) break;
        if (score === 0) matchIdx = idx;
        score += 10;
        searchFrom = idx + queryLower.length;
      }

      if (score === 0 && queryTerms.length >= 1) {
        for (const term of queryTerms) {
          let sf = 0;
          while (true) {
            const idx = lower.indexOf(term, sf);
            if (idx === -1) break;
            if (matchIdx === -1) matchIdx = idx;
            score += 1;
            sf = idx + term.length;
          }
        }
      }

      return { score, matchIdx };
    }

    const candidates: Array<{
      score: number;
      matchIdx: number;
      rawCombined: string;
      pageId: string;
      notebookId: string;
      notebookName: string;
      title: string;
    }> = [];

    for (const page of Object.values(pages)) {
      if (page.trashedAt) continue;
      if (!loaded.has(page.workspaceId)) continue;
      if (!canReadNotebookResource(context, page)) continue;
      if (page.localReadState === "error") {
        errors.push(`${page.id}: ${page.localReadError || "页面读取失败"}`);
        continue;
      }

      const title = getPageTitle(page);
      const bodyText = getContentDerivationsForPage(page).text;
      const rawCombined = `${title}\n${bodyText}`;

      const { score, matchIdx } = scoreText(rawCombined);
      if (score === 0) continue;

      const nb = notebooks[page.workspaceId];
      candidates.push({
        score,
        matchIdx,
        rawCombined,
        pageId: page.id,
        notebookId: page.workspaceId,
        notebookName: nb?.name ?? page.workspaceId,
        title,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 20);

    const results = top.map(
      ({ pageId, notebookId, notebookName, title, rawCombined, matchIdx }) => {
        const safeIdx = Math.max(0, matchIdx);
        const start = Math.max(0, safeIdx - 60);
        const end = Math.min(rawCombined.length, safeIdx + query.length + 60);
        let snippet = rawCombined.slice(start, end);
        if (start > 0) snippet = "…" + snippet;
        if (end < rawCombined.length) snippet = snippet + "…";

        return { pageId, notebookId, notebookName, title, snippet };
      },
    );
    return errors.length ? { results, errors, complete: false,
      unsearchedNotebookIds: ids.filter((id) => !loaded.has(id)) } : results;
  },
});

export const readPage = tool({
  description:
    "读取页面完整内容，返回标题和 Markdown 格式正文。当前页任务可省略 pageId，默认读取当前打开页面。",
  inputSchema: z.object({
    pageId: z.string().optional().describe("页面 id；省略则读取本轮绑定页面"),
    notebookId: z.string().optional().describe("跨笔记本读取时提供真实 notebookId"),
  }),
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as NotebookAiAgentContext;
    const pageId = input.pageId ?? context.currentPageId ?? "";
    let refreshedIndex = false;
    try {
      const knownPage = usePages.getState().pages[pageId];
      const ownerId = input.notebookId ?? knownPage?.workspaceId;
      const ids = ownerId ? [ownerId] : readableNotebookIds(context);
      if (ids.some((id) => !canAccessNotebook(context, id))) throw new Error("笔记本不存在或已卸载");
      for (const id of ids) {
        const before = useNotebooks.getState().getLocalFolderLoadState(id);
        await ensureNotebookReferenceIndex(id);
        refreshedIndex ||= before !== useNotebooks.getState().getLocalFolderLoadState(id);
      }
    } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
    let page = usePages.getState().pages[pageId];
    if (!page || (input.notebookId && input.notebookId !== page.workspaceId)) return { error: "页面不存在或归属变化，请重新选择" };
    if (page.isFolder || !canReadNotebookResource(context, page)) return { error: "页面不存在或已删除；目录请先 listFolder" };
    if (page.localReadState === "error" && page.localFilePath && !refreshedIndex) {
      await usePages.getState().reloadLocalPageFromDisk(pageId);
      page = usePages.getState().pages[pageId];
      if (!page || !canReadNotebookResource(context, page)) return { error: "页面不存在或已删除" };
    }
    if (page.localReadState === "error") return { error: page.localReadError || "页面读取失败" };
    const title = getPageTitle(page);
    const markdown = await blocksToMarkdown(page.content as BlockNoteContent);
    return { pageId, notebookId: page.workspaceId, parentId: page.parentId ?? null, relativePath: getLocationSnapshot(page, useNotebooks.getState().notebooks, usePages.getState().pages), title, markdown, readStatus: "ready" };
  },
});
