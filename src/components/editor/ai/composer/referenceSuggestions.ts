import type { Page } from "@/types";
import type { Notebook } from "@/stores/useNotebooks";
import type { AiReferenceSuggestionItem } from "./referenceTypes";
import { findReferencePages, type ReferenceSearchOptions } from "./referenceSearchIndex";
import {
  buildAiFileReferenceAttrs,
  getNotebookSnapshot,
  getLocationSnapshot,
} from "./referenceMetadata";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/composer/referenceSuggestions.ts#messages:1">`
zh-Hans:
  unknownNotebook: "未知笔记本"
  appPage: "应用页面"
  appPageNotebook: "应用页面 · {{notebookName}}"
en:
  unknownNotebook: "Unknown notebook"
  appPage: "App page"
  appPageNotebook: "App page · {{notebookName}}"
ja:
  unknownNotebook: "不明なノートブック"
  appPage: "アプリのページ"
  appPageNotebook: "アプリのページ · {{notebookName}}"
`;
const t = createTranslator(messages);


function buildDescription(
  page: Page,
  notebooks: Record<string, Notebook>,
  activeNotebookId: string | null,
  pages: Record<string, Page>,
) {
  const wsId = page.workspaceId ?? (page as { notebookId?: string }).notebookId;
  const notebook = getNotebookSnapshot(wsId, notebooks);
  const notebookName = notebook?.name ?? t("unknownNotebook");
  const isActiveNotebook =
    activeNotebookId != null && wsId === activeNotebookId;

  if (page.isFolder || page.localFilePath) {
    const location = getLocationSnapshot(page, notebooks, pages);
    if (isActiveNotebook) return location;
    return `${notebookName} · ${location}`;
  }

  return isActiveNotebook ? t("appPage") : t("appPageNotebook", { notebookName });
}

export function getAiReferenceSuggestionItems(
  query: string,
  pages: Record<string, Page>,
  notebooks: Record<string, Notebook>,
  activeNotebookId: string | null,
  options?: ReferenceSearchOptions,
) {
  return findReferencePages(query, pages, notebooks, activeNotebookId, options)
    .map((page) => {
      const attrs = buildAiFileReferenceAttrs(page, notebooks, pages);
      return {
        ...attrs,
        title: attrs.titleSnapshot,
        description: buildDescription(page, notebooks, activeNotebookId, pages),
        isFolder: page.isFolder,
      } satisfies AiReferenceSuggestionItem;
    });
}
