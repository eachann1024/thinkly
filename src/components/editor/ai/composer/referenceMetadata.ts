import type { Page } from "@/types";
import type { Notebook } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type {
  AiFileReferenceAttrs,
  AiFileReferenceSourceType,
} from "./referenceTypes";

export function getSourceType(page: Page): AiFileReferenceSourceType {
  return page.localFilePath ? "local-file" : "app-page";
}

export function getNotebookSnapshot(
  workspaceId: string,
  notebooks: Record<string, Notebook>,
) {
  return notebooks[workspaceId];
}

export function getLocationSnapshot(
  page: Page,
  notebooks: Record<string, Notebook>,
  pages: Record<string, Page> = {},
) {
  const notebook = getNotebookSnapshot(page.workspaceId, notebooks);
  if (!page.localFilePath) {
    const parts = [getPageTitle(page)];
    const visited = new Set([page.id]);
    let parentId = page.parentId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = pages[parentId];
      if (!parent || parent.workspaceId !== page.workspaceId) break;
      parts.unshift(getPageTitle(parent));
      parentId = parent.parentId;
    }
    return parts.join("/");
  }

  const basePath = notebook?.localPath?.replace(/[\\/]+$/, "") ?? "";
  const normalizedPath = page.localFilePath.replace(/[\\/]+/g, "/");
  const normalizedBase = basePath.replace(/[\\/]+/g, "/");

  if (normalizedBase && (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`))) {
    const relativePath = normalizedPath
      .slice(normalizedBase.length)
      .replace(/^\/+/, "");
    return relativePath || normalizedPath;
  }

  return normalizedPath;
}

export function buildAiFileReferenceAttrs(
  page: Page,
  notebooks: Record<string, Notebook>,
  pages: Record<string, Page> = {},
): AiFileReferenceAttrs {
  const wsId = page.workspaceId ?? (page as { notebookId?: string }).notebookId;
  const notebook = getNotebookSnapshot(wsId, notebooks);
  return {
    pageId: page.id,
    refId: `${wsId}:${page.isFolder ? "folder" : "page"}:${page.id}`,
    kind: page.isFolder ? "folder" : "page",
    parentId: page.parentId,
    workspaceId: wsId ?? "",
    titleSnapshot: getPageTitle(page),
    sourceType: getSourceType(page),
    localFilePath: page.localFilePath,
    notebookNameSnapshot: notebook?.name ?? "未知笔记本",
    locationSnapshot: getLocationSnapshot(page, notebooks, pages),
  };
}
