import { create } from "zustand";
import { initialSearchSession, transitionSearchSession, type SearchSessionState, type SearchSessionEvent, type SearchScope, type SearchSort } from "./searchSessionState";
export type { SearchScope, SearchSort } from "./searchSessionState";

type SearchSession = SearchSessionState & {
  openSearch: (notebookId: string | null, pageId: string | null, scrollTop: number) => void;
  closeSearch: () => void;
  reopenSheet: () => void;
  dismissSheet: () => void;
  setTitleOnly: (titleOnly: boolean) => void;
  setSort: (sort: SearchSort) => void;
  setQuery: (query: string) => void;
  setScope: (scope: SearchScope) => void;
  targetPage: (pageId: string, enter?: boolean, restoreTop?: number | null) => void;
  rememberMatch: (key: string, index: number) => void;
};
export function searchMemoryKey(pageId: string, query: string, scope: SearchScope) {
  return JSON.stringify([pageId, query.trim().toLowerCase(), scope]);
}
export const useSearchSession = create<SearchSession>((set) => {
  const send = (event: SearchSessionEvent) => set(s => transitionSearchSession(s, event));
  return { ...initialSearchSession,
    openSearch: (notebookId, pageId, scrollTop) => send({ type: "opened", notebookId, pageId, scrollTop }),
    closeSearch: () => send({ type: "closed" }),
    reopenSheet: () => send({ type: "sheet-reopened" }),
    dismissSheet: () => send({ type: "sheet-dismissed" }),
    setTitleOnly: titleOnly => send({ type: "title-filter-edited", titleOnly }),
    setSort: sort => send({ type: "sort-edited", sort }),
    setQuery: query => send({ type: "query-edited", query }),
    setScope: scope => send({ type: "scope-edited", scope }),
    targetPage: (pageId, enterReader = false, restoreTop = null) => send({ type: "target-requested", pageId, enterReader, restoreTop }),
    rememberMatch: (key, index) => send({ type: "match-remembered", key, index }),
  };
});
