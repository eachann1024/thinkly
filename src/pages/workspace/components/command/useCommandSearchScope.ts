import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/command/useCommandSearchScope.ts#localMessages:1">`
zh-Hans:
  couldnTReadTheSearchFolderClose: "搜索目录读取失败，请关闭搜索后重试"
en:
  couldnTReadTheSearchFolderClose: "Couldn’t read the search folder. Close search and try again."
ja:
  couldnTReadTheSearchFolderClose: "検索対象のフォルダを読み込めませんでした。検索を閉じてからもう一度お試しください"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useState } from "react";
import type { Page } from "@/types";
import {
  filterCatalogByScope, getSearchCatalog, syncSearchCatalog,
  type SearchCatalog, type SearchNotebooks,
} from "./pageSearchCatalog";

const EMPTY_PAGES: Page[] = [];
interface ScopeSnapshot {
  pages: Record<string, Page>;
  notebooks: SearchNotebooks;
  all: boolean;
  activeId: string | null;
  catalog: SearchCatalog | null;
  scope: Page[];
  error: "catalog-read-failed" | null;
}

export function useCommandSearchScope(
  pages: Record<string, Page>, notebooks: SearchNotebooks,
  all: boolean, activeId: string | null, enabled: boolean,
) {
  useLocale();
  const [prepared, setPrepared] = useState<ScopeSnapshot | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const snapshot = { pages, notebooks, all, activeId };
    void (async () => {
      const catalog = await syncSearchCatalog(pages, notebooks);
      if (!catalog || controller.signal.aborted) return;
      const scope = await filterCatalogByScope(
        catalog.sortedByTitle, notebooks, all, activeId, controller.signal,
      );
      if (!scope || controller.signal.aborted) return;
      setPrepared({ ...snapshot, catalog, scope, error: null });
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error("Command search catalog failed", error);
      setPrepared({ ...snapshot, catalog: null, scope: EMPTY_PAGES,
        error: "catalog-read-failed" });
    });
    return () => { controller.abort(); };
  }, [pages, notebooks, all, activeId, enabled]);
  const current = prepared?.pages === pages && prepared.notebooks === notebooks &&
    prepared.all === all && prepared.activeId === activeId ? prepared : null;
  const cached = getSearchCatalog();
  const catalog = current?.catalog ??
    (cached.pagesRef === pages && cached.notebooksRef === notebooks ? cached : null);
  return {
    scope: current?.scope ?? EMPTY_PAGES,
    catalog,
    error: current?.error ? uiText("couldnTReadTheSearchFolderClose") : null,
    ready: Boolean(current),
  };
}
