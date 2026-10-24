import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/command/searchPageFilter.ts#localMessages:1">`
zh-Hans:
  untitled: "无标题"
en:
  untitled: "Untitled"
ja:
  untitled: "無題"
`;
const uiText = createTranslator(localMessages);
import { getPageTitle } from "@/components/editor/utils/page-title";
import { isCanonicalPathInside } from "@/lib/canonicalLocalPath";
import type { Page } from "@/types";

export type SearchNotebook = {
  source?: "default" | "local-folder";
  localPath?: string;
  localPathMissing?: boolean;
  excludeFromGlobalSearch?: boolean;
};

function belongsToSearchNotebook(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
): boolean {
  const notebook = notebooks[page.workspaceId];
  if (!notebook) return false;
  if (notebook.source !== "local-folder") return true;
  return Boolean(
    notebook.localPath && !notebook.localPathMissing && page.localFilePath &&
    isCanonicalPathInside(page.localFilePath, notebook.localPath),
  );
}

export function isCommandSearchablePage(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
): boolean {
  if (page.trashedAt || page.localUnsaved ||
      !belongsToSearchNotebook(page, notebooks)) return false;

  const title = getPageTitle(page);
  if (!title || title === uiText("untitled")) return false;

  return !(
    notebooks[page.workspaceId]?.source === "local-folder" && page.isFolder
  );
}

export function shouldIncludePageInCommandScope(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
  searchAllNotebooks: boolean,
  currentNotebookId?: string | null,
): boolean {
  if (!belongsToSearchNotebook(page, notebooks)) return false;
  if (!searchAllNotebooks) return true;
  if (currentNotebookId && page.workspaceId === currentNotebookId) return true;
  return !notebooks[page.workspaceId]?.excludeFromGlobalSearch;
}
