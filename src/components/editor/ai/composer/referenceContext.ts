import type { Page } from "@/types";
import type { Notebook } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import {
  getContentStructureSummaryForPage,
  getContentDerivationsForPage,
} from "@/components/editor/utils/content-page-derivations-cache";
import type {
  AiFileReferenceAttrs,
  ResolvedAiReferenceContext,
} from "./referenceTypes";
import {
  getLocationSnapshot,
  getSourceType,
} from "./referenceMetadata";

function resolveReferenceLocation(
  page: Page,
  notebooks: Record<string, Notebook>,
  pages: Record<string, Page>,
) {
  if (!page.localFilePath) {
    return getLocationSnapshot(page, notebooks, pages);
  }

  return getLocationSnapshot(page, notebooks, pages);
}

function listFolderChildLines(
  page: Page,
  pages: Record<string, Page>,
  reference: AiFileReferenceAttrs,
): string[] {
  return Object.values(pages)
    .filter((child) => child.workspaceId === page.workspaceId && child.parentId === page.id && !child.trashedAt && !reference.excludedPageIds?.includes(child.id))
    .sort((a, b) => {
      if (Boolean(a.isFolder) !== Boolean(b.isFolder))
        return a.isFolder ? -1 : 1;
      return getPageTitle(a).localeCompare(getPageTitle(b), "zh-CN", {
        numeric: true,
      });
    })
    .map((child) => {
      const title = getPageTitle(child);
      return child.isFolder ? `${title}/` : title;
    });
}

export function buildFolderReferenceContext(
  page: Page,
  pages: Record<string, Page>,
  notebooks: Record<string, Notebook>,
  reference: AiFileReferenceAttrs,
): ResolvedAiReferenceContext {
  const notebookName =
    notebooks[page.workspaceId]?.name ??
    reference.notebookNameSnapshot ??
    "未知笔记本";
  const childLines = listFolderChildLines(page, pages, reference);
  const listing = childLines.length
    ? `目录子项：\n${childLines.map((line) => `- ${line}`).join("\n")}`
    : "（空目录）";
  return {
    reference,
    title: getPageTitle(page),
    sourceType: getSourceType(page),
    notebookName,
    location: resolveReferenceLocation(page, notebooks, pages),
    contentText: `${listing}\n状态：仅有目录索引，子页正文尚未读取。请调用 listFolder 分页枚举，再 readPage。`,
    structureSummary: childLines.length
      ? `目录，${childLines.length} 个子项：\n${childLines.map((line) => `- ${line}`).join("\n")}`
      : "索引中暂无子项；这不证明磁盘完整目录为空",
    readStatus: "ready",
    coverage: { enumerated: childLines.length, loaded: 0, omitted: childLines.length, recursive: reference.recursive !== false },
  };
}

function buildFallbackReferenceContext(
  reference: AiFileReferenceAttrs,
  errorMessage: string,
): ResolvedAiReferenceContext {
  return {
    reference,
    title: reference.titleSnapshot,
    sourceType: reference.sourceType,
    notebookName: reference.notebookNameSnapshot ?? "未知笔记本",
    location: reference.locationSnapshot ?? "未知位置",
    contentText: "",
    structureSummary: "",
    readStatus: "error",
    errorMessage,
  };
}

export function resolveAiReferenceContexts(
  references: AiFileReferenceAttrs[],
  pages: Record<string, Page>,
  notebooks: Record<string, Notebook>,
) {
  return references.map((reference) => {
    if (reference.kind === "notebook") {
      const notebook = notebooks[reference.workspaceId];
      if (!notebook) return buildFallbackReferenceContext(reference, "笔记本已失效，请重新选择");
      const excluded = new Set(reference.excludedPageIds ?? []);
      const entries = Object.values(pages).filter((page) => {
        if (page.workspaceId !== reference.workspaceId || page.trashedAt || (reference.recursive === false && page.parentId)) return false;
        const visited = new Set<string>();
        let candidate: Page | undefined = page;
        while (candidate && !visited.has(candidate.id)) {
          if (excluded.has(candidate.id)) return false;
          visited.add(candidate.id);
          candidate = candidate.parentId ? pages[candidate.parentId] : undefined;
        }
        return true;
      });
      const summary = `笔记本根目录，仅有 ${entries.length} 条所选范围索引，正文尚未读取。请 listFolder 分页枚举，再 readPage；索引数量不证明磁盘枚举完整。`;
      return {
        reference, title: notebook.name, sourceType: reference.sourceType,
        notebookName: notebook.name, location: "/", contentText: summary,
        structureSummary: summary,
        readStatus: "ready", coverage: { enumerated: entries.length, loaded: 0, omitted: entries.length, recursive: reference.recursive !== false },
      } satisfies ResolvedAiReferenceContext;
    }
    const page = pages[reference.pageId];
    if (!page || page.trashedAt || page.workspaceId !== reference.workspaceId) {
      return buildFallbackReferenceContext(
        reference,
        "引用目标不存在、归属变化或尚未加载，请重新选择",
      );
    }

    const notebookName =
      notebooks[page.workspaceId]?.name ??
      reference.notebookNameSnapshot ??
      "未知笔记本";

    if (page.localFilePath && page.localReadState === "error") {
      return buildFallbackReferenceContext(
        reference,
        page.localReadError || "本地文件当前不可读取",
      );
    }

    if (page.isFolder) {
      return buildFolderReferenceContext(page, pages, notebooks, reference);
    }

    return {
      reference,
      title: getPageTitle(page),
      sourceType: getSourceType(page),
      notebookName,
      location: resolveReferenceLocation(page, notebooks, pages),
      contentText: getContentDerivationsForPage(page).text.trim(),
      coverage: { enumerated: 1, loaded: 1, omitted: 0, recursive: false },
      structureSummary: getContentStructureSummaryForPage(page),
      readStatus: "ready",
    } satisfies ResolvedAiReferenceContext;
  });
}

export function formatAiReferenceContextBlock(
  contexts: ResolvedAiReferenceContext[],
) {
  if (!contexts.length) return "";

  return contexts
    .map((context, index) => {
      const sourceLabel =
        context.sourceType === "local-file" ? "本地文件" : "应用页面";

      if (context.readStatus === "error") {
        return [
          `[引用 ${index + 1}]`,
          `标题：${context.title}`,
          `来源：${sourceLabel} · ${context.notebookName}`,
          `位置：${context.location}`,
          `状态：读取失败`,
          `错误：${context.errorMessage || "未知错误"}`,
        ].join("\n");
      }

      return [
        `[引用 ${index + 1}]`,
        `标题：${context.title}`,
        `来源：${sourceLabel} · ${context.notebookName}`,
        `位置：${context.location}`,
        context.structureSummary || context.contentText || "（空白内容）",
      ].join("\n");
    })
    .join("\n\n");
}

export function getAiReferenceStats(references: AiFileReferenceAttrs[]) {
  return references.reduce(
    (stats, reference) => {
      stats.referenceCount += 1;
      if (reference.sourceType === "local-file") {
        stats.localReferenceCount += 1;
      } else {
        stats.appReferenceCount += 1;
      }
      return stats;
    },
    {
      referenceCount: 0,
      appReferenceCount: 0,
      localReferenceCount: 0,
    },
  );
}
