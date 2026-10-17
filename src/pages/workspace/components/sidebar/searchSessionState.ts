export type SearchSort = "best" | "recent";
export type SearchScope =
  | { kind: "current"; notebookId: string | null }
  | { kind: "all" }
  | { kind: "notebook"; notebookId: string };
type SearchContext = {
  startingNotebookId: string | null;
  originPageId: string | null;
  originScrollTop: number;
};
export type SearchView =
  | { phase: "closed" }
  | { phase: "sheet"; context: SearchContext }
  | { phase: "reader"; context: SearchContext };
export type SearchNavigation =
  | { phase: "none" }
  | { phase: "target"; pageId: string; id: number; enterReader: boolean; restoreTop: number | null };
export type SearchSessionState = {
  view: SearchView;
  navigation: SearchNavigation;
  query: string;
  titleOnly: boolean;
  sort: SearchSort;
  scope: SearchScope;
  requestSequence: number;
  focusNonce: number;
  memories: Record<string, number>;
};
export type SearchSessionEvent =
  | { type: "opened"; notebookId: string | null; pageId: string | null; scrollTop: number }
  | { type: "closed" }
  | { type: "query-edited"; query: string }
  | { type: "title-filter-edited"; titleOnly: boolean }
  | { type: "sort-edited"; sort: SearchSort }
  | { type: "scope-edited"; scope: SearchScope }
  | { type: "target-requested"; pageId: string; enterReader: boolean; restoreTop: number | null }
  | { type: "match-remembered"; key: string; index: number };
export const initialSearchSession: SearchSessionState = {
  view: { phase: "closed" }, navigation: { phase: "none" }, query: "",
  titleOnly: false, sort: "best", scope: { kind: "all" },
  requestSequence: 0,
  focusNonce: 0, memories: {},
};
export function transitionSearchSession(s: SearchSessionState, event: SearchSessionEvent): SearchSessionState {
  switch (event.type) {
    case "opened":
      return { ...s, focusNonce: s.focusNonce + 1, scope: { kind: "all" },
        view: { phase: "sheet", context: s.view.phase !== "closed" ? s.view.context : {
          startingNotebookId: event.notebookId, originPageId: event.pageId, originScrollTop: event.scrollTop,
        } } };
    case "closed":
      return { ...s, view: { phase: "closed" }, navigation: { phase: "none" } };
    case "query-edited":
      return { ...s, query: event.query };
    case "title-filter-edited":
      return { ...s, titleOnly: event.titleOnly };
    case "sort-edited":
      return { ...s, sort: event.sort };
    case "scope-edited":
      return { ...s, scope: event.scope };
    case "target-requested":
      if (s.view.phase === "closed") return s;
      return { ...s, requestSequence: s.requestSequence + 1,
        view: event.enterReader ? { phase: "reader", context: s.view.context } : s.view,
        navigation: { phase: "target", pageId: event.pageId, id: s.requestSequence + 1,
          enterReader: event.enterReader, restoreTop: event.restoreTop } };
    case "match-remembered":
      return s.memories[event.key] === event.index ? s : {
        ...s, memories: { ...s.memories, [event.key]: event.index },
      };
  }
}
