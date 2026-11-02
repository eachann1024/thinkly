import { createTranslator, i18nYaml, useLocale } from "@/i18n";
const localMessages = i18nYaml<"src/pages/workspace/components/command/useVersionedCommandSearchScope.ts#localMessages:1">`
zh-Hans:
  catalogReadFailed: "搜索目录读取失败，请关闭搜索后重试"
en:
  catalogReadFailed: "Couldn’t read the search folder. Close search and try again."
ja:
  catalogReadFailed: "検索対象のフォルダを読み込めませんでした。検索を閉じてからもう一度お試しください"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Page } from "@/types";
import { filterCatalogByScope, syncSearchCatalog, type SearchCatalog, type SearchNotebooks } from "./pageSearchCatalog";
import { createSearchScopePageVersion, searchScopeConfigKey } from "./searchScopePageVersion";
import { createSearchTaskBudget } from "./searchTaskScheduling";

const EMPTY_PAGES: Page[] = [];
interface Prepared {
  version: object; catalog: SearchCatalog | null; scope: Page[];
  error: "catalog-read-failed" | null;
}

export function useVersionedCommandSearchScope(
  pages: Record<string, Page>, notebooks: SearchNotebooks,
  all: boolean, activeId: string | null, enabled: boolean,
) {
  const locale = useLocale();
  const configKey = searchScopeConfigKey(notebooks, all, activeId);
  const selectVersion = useMemo(() => createSearchScopePageVersion(notebooks, all, activeId), [configKey, locale]);
  const version = selectVersion(pages);
  const latest = useRef({ pages, notebooks });
  useLayoutEffect(() => { latest.current = { pages, notebooks }; }, [pages, notebooks]);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;
    void (async () => {
      // A warmup can supersede a build with an unrelated page update. Retry the
      // newest snapshot; the scoped version still guards relevant changes.
      while (!signal.aborted) {
        const snapshot = latest.current;
        const catalog = await syncSearchCatalog(snapshot.pages, snapshot.notebooks);
        if (signal.aborted) return;
        if (!catalog) continue;
        const metadataScope = await filterCatalogByScope(
          catalog.sortedByTitle, snapshot.notebooks, all, activeId, signal,
        );
        if (!metadataScope || signal.aborted) return;
        const scope: Page[] = [];
        const pause = createSearchTaskBudget(signal);
        for (const page of metadataScope) {
          if (signal.aborted) return;
          scope.push(catalog.pagesRef![page.id]);
          const wait = pause(); if (wait) await wait;
        }
        if (!signal.aborted) setPrepared({ version, catalog, scope, error: null });
        return;
      }
    })().catch((error: unknown) => {
      if (signal.aborted) return;
      console.error("Command search catalog failed", error);
      setPrepared({ version, catalog: null, scope: EMPTY_PAGES, error: "catalog-read-failed" });
    });
    return () => controller.abort();
  }, [version, enabled]);
  const current = prepared?.version === version ? prepared : null;
  return { version, scope: current?.scope ?? EMPTY_PAGES, catalog: current?.catalog ?? null,
    ready: Boolean(current), error: current?.error ? uiText("catalogReadFailed") : null };
}
