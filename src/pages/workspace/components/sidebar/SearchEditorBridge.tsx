import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SearchEditorBridge.tsx#localMessages:1">`
zh-Hans:
  backToTheFirstMatch_2870: "已回到第一处"
  backToTheLastMatch_e02d: "已回到最后一处"
  notebook_1873: "笔记本"
  showFullNotePath_cbcb: "查看笔记完整路径"
  searchMatchNavigation_00ab: "搜索命中导航"
  backToSearchResults_69e3: "返回搜索结果"
  searchResults_098f: "搜索结果"
  matchPosition: "{{current}} / {{count}} 处"
  titleMatch_92f9: "标题匹配"
  noMatchesInNoteContent_997e: "正文无匹配"
  previousMatch_cd54: "上一处匹配"
  nextMatch_98c3: "下一处匹配"
  backToOriginalNote_7521: "返回起始笔记"
  exitSearch_3633: "退出搜索"
en:
  backToTheFirstMatch_2870: "Back to the first match"
  backToTheLastMatch_e02d: "Back to the last match"
  notebook_1873: "Notebook"
  showFullNotePath_cbcb: "Show full note path"
  searchMatchNavigation_00ab: "Search match navigation"
  backToSearchResults_69e3: "Back to search results"
  searchResults_098f: "Search results"
  matchPosition: "Match {{current}} of {{count}}"
  titleMatch_92f9: "Title match"
  noMatchesInNoteContent_997e: "No matches in note content"
  previousMatch_cd54: "Previous match"
  nextMatch_98c3: "Next match"
  backToOriginalNote_7521: "Back to original note"
  exitSearch_3633: "Exit search"
`;
const uiText = createTranslator(localMessages);
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, X } from "@/components/ui/icons";
import type { EditorRef } from "@/components/editor/core/Editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { findCollapsedHeadingsHidingBlock, type SectionFoldBlock } from "@/components/editor/core/headingSectionFold";
import { clearSearchSessionHighlight, getSearchSessionHighlightState, selectSearchSessionHighlight, setSearchSessionHighlightQuery, subscribeSearchSessionHighlight } from "@/components/editor/find/searchSessionHighlightPlugin";
import { searchMemoryKey, useSearchSession } from "./useSearchSession";
import "./search-editor-bridge.css";

/** 居中命中若会把正文标题切掉一截，则留在文首；放不下时整段滚出，避免半截标题。 */
function placeSearchMatch(scroller: HTMLElement, target: HTMLElement) {
  const hit = target.getBoundingClientRect();
  const box = scroller.getBoundingClientRect();
  const pad = 24;
  const top = scroller.scrollTop + hit.top - box.top;
  const view = scroller.clientHeight;
  const minScroll = Math.max(0, top + hit.height + pad - view);
  const maxScroll = Math.max(minScroll, top - pad);
  let next = Math.min(Math.max(top - (view - hit.height) / 2, minScroll), maxScroll);
  const title = scroller.querySelector<HTMLElement>(".page-document-title");
  if (title) {
    const titleEnd = scroller.scrollTop + title.getBoundingClientRect().bottom - box.top;
    if (next > 0 && next < titleEnd) next = minScroll === 0 ? 0 : Math.min(maxScroll, Math.max(titleEnd, minScroll));
  }
  scroller.scrollTop = next;
}

export function SearchEditorBridge({ pageId, focused, editorRef, scrollRef, cancelPendingRestoration }: {
  pageId: string; focused: boolean; editorRef: RefObject<EditorRef | null>; scrollRef: RefObject<HTMLDivElement | null>;
  cancelPendingRestoration: () => void;
}) {
  useLocale();
  const session = useSearchSession(useShallow(s => ({
    open: s.view.phase !== "closed", query: s.query, scope: s.scope,
    requestNonce: s.navigation.phase === "target" ? s.navigation.id : 0,
    origin: s.view.phase !== "closed" ? s.view.context : null,
  })));
  const page = usePages(s => s.pages[pageId]);
  const pages = usePages(s => s.pages);
  const notebooks = useNotebooks(s => s.notebooks);
  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState("");
  const [pathOpen, setPathOpen] = useState(false);
  const frame = useRef(0);
  const handled = useRef(0);
  const previouslyVisible = useRef(false);
  const navigationReadyAt = useRef(0);
  const visible = session.open && focused;
  const key = searchMemoryKey(pageId, session.query, session.scope);
  const close = () => {
    useSearchSession.getState().closeSearch();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.sidebar-mode-rail-button[data-sidebar-view="search"]')?.focus({ preventScroll: true }));
  };
  const locate = () => {
    const editor = editorRef.current?.editor;
    if (!editor || editor._tiptapEditor.isDestroyed) return;
    const state = getSearchSessionHighlightState(editor);
    const match = state?.matches[state.current];
    if (!match) { if (page && session.query && getPageTitle(page).toLowerCase().includes(session.query.trim().toLowerCase()) && scrollRef.current) scrollRef.current.scrollTop = 0; return; }
    const dom = editor.prosemirrorView.domAtPos(match.from);
    const element = dom.node.nodeType === Node.TEXT_NODE ? dom.node.parentElement : dom.node as HTMLElement;
    const blockId = element?.closest("[data-id]")?.getAttribute("data-id");
    if (blockId) {
      const ids = findCollapsedHeadingsHidingBlock(editor.document as SectionFoldBlock[], blockId, editor.document[0]?.id);
      for (const id of ids) { const block = editor.getBlock(id); if (block?.type === "heading" || block?.type === "toggleListItem") editor.updateBlock(block, { props: { collapsed: false } }); }
      let ancestor = element?.parentElement;
      while (ancestor && ancestor !== editor.prosemirrorView.dom) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
    }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (useSearchSession.getState().view.phase === "closed" || editor._tiptapEditor.isDestroyed || editorRef.current?.editor !== editor || editor.prosemirrorView.dom.dataset.searchPageId !== pageId) return;
      const scroller = scrollRef.current;
      const target = (editor.prosemirrorView.dom as HTMLElement).querySelector<HTMLElement>(".goose-search-session-match--current");
      if (!scroller || !target) return;
      placeSearchMatch(scroller, target);
    });
  };
  const step = (delta: number) => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    const latest = useSearchSession.getState();
    const latestKey = searchMemoryKey(pageId, latest.query, latest.scope);
    if (getSearchSessionHighlightState(editor)?.query !== latest.query.trim()) {
      setSearchSessionHighlightQuery(editor, latest.query, false, latest.memories[latestKey] ?? 0);
    }
    const value = getSearchSessionHighlightState(editor);
    if (!value?.matches.length) return;
    const next = (value.current + delta + value.matches.length) % value.matches.length;
    selectSearchSessionHighlight(editor, next, false);
    useSearchSession.getState().rememberMatch(latestKey, next);
    setMessage(delta > 0 && next === 0 ? uiText("backToTheFirstMatch_2870") : delta < 0 && next === value.matches.length - 1 ? uiText("backToTheLastMatch_e02d") : "");
    locate();
  };
  useEffect(() => {
    let cancelled = false;
    if (visible && !previouslyVisible.current) navigationReadyAt.current = performance.now() + 200;
    previouslyVisible.current = visible;
    const apply = () => {
      if (cancelled) return;
      const editor = editorRef.current?.editor;
      if (!editor || editor._tiptapEditor.isDestroyed) return;
      // Editor stamps this only after replacing the document for this page.
      if (editor.prosemirrorView.dom.dataset.searchPageId !== pageId) return;
      const latest = useSearchSession.getState();
      if (latest.query !== session.query || latest.scope !== session.scope || (latest.view.phase !== "closed") !== session.open) return;
      const previous = getSearchSessionHighlightState(editor);
      const query = visible ? session.query.trim() : "";
      if (previous?.query !== query) {
        const saved = useSearchSession.getState().memories[key] ?? 0;
        setSearchSessionHighlightQuery(editor, query, false, saved);
      }
      const state = getSearchSessionHighlightState(editor);
      setCount(state?.matches.length ?? 0); setCurrent((state?.current ?? -1) + 1);
      const request = useSearchSession.getState().navigation;
      if (visible && request.phase === "target" && request.pageId === pageId && request.id !== handled.current) {
        handled.current = request.id;
        // Explicit search navigation takes priority over the page's saved scroll position.
        const titleMatch = query && page && getPageTitle(page).toLowerCase().includes(query.toLowerCase());
        if (request.restoreTop !== null || state?.matches.length || titleMatch) cancelPendingRestoration();
        if (request.restoreTop !== null && scrollRef.current) scrollRef.current.scrollTop = request.restoreTop;
        else locate();
        if (request.enterReader) {
          scrollRef.current?.focus({ preventScroll: true });
        }
        if (request.enterReader) {
          window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
        }
      }
    };
    const refresh = () => {
      const editor = editorRef.current?.editor;
      if (!editor || editor._tiptapEditor.isDestroyed) return;
      const state = getSearchSessionHighlightState(editor);
      setCount(state?.matches.length ?? 0); setCurrent((state?.current ?? -1) + 1);
    };
    const unsubscribe = subscribeSearchSessionHighlight((_state, view) => {
      if (editorRef.current?.editor?.prosemirrorView === view) refresh();
    });
    const navigation = useSearchSession.getState().navigation;
    const immediate = !visible || !session.query.trim() ||
      (navigation.phase === "target" && navigation.pageId === pageId && navigation.id !== handled.current);
    const applyAfter = performance.now() + (immediate ? 0 : Math.max(120, navigationReadyAt.current - performance.now()));
    let timer = 0;
    const ready = () => {
      window.clearTimeout(timer);
      const remaining = applyAfter - performance.now();
      if (remaining <= 0) apply();
      else timer = window.setTimeout(apply, remaining);
    };
    // Editor readiness may arrive during navigation; it must retain the same deadline.
    ready();
    window.addEventListener("goose-note:search-editor-ready", ready);
    return () => { cancelled = true; window.clearTimeout(timer); cancelAnimationFrame(frame.current); unsubscribe(); window.removeEventListener("goose-note:search-editor-ready", ready); };
  }, [visible, pageId, session.query, session.scope, session.requestNonce, key, editorRef, scrollRef, cancelPendingRestoration]);
  useEffect(() => () => {
    const editor = editorRef.current?.editor;
    if (editor && !editor._tiptapEditor.isDestroyed) clearSearchSessionHighlight(editor);
  }, [editorRef]);
  useEffect(() => {
    if (!visible) { setPathOpen(false); return; }
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      if (event.key === "F3" && !document.querySelector("[data-goose-find-in-page]")) { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
      if (event.key === "Escape" && !pathOpen && !document.querySelector("[data-goose-find-in-page]")) { event.preventDefault(); close(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, pathOpen, key]);
  if (!visible || !page) return null;
  const crumbs = [getPageTitle(page)];
  const seen = new Set([page.id]); let parentId = page.parentId;
  while (parentId && pages[parentId] && !seen.has(parentId)) { seen.add(parentId); crumbs.unshift(getPageTitle(pages[parentId])); parentId = pages[parentId].parentId; }
  crumbs.unshift(notebooks[page.workspaceId]?.name ?? uiText("notebook_1873"));
  const titleOnly = !count && session.query.trim() && getPageTitle(page).toLowerCase().includes(session.query.trim().toLowerCase());
  return <>
    <div className="search-editor-path"><Popover open={pathOpen} onOpenChange={setPathOpen}><PopoverTrigger asChild><Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" aria-label={uiText("showFullNotePath_cbcb")} title={crumbs.join(" / ")}>{crumbs.length > 2 ? `${crumbs[0]} / ${crumbs.at(-2)}` : crumbs.join(" / ")}</Button></PopoverTrigger><PopoverContent align="end" className="max-w-[min(24rem,85vw)] break-words text-sm">{crumbs.join(" / ")}</PopoverContent></Popover></div>
    <div className="search-editor-matchbar" aria-label={uiText("searchMatchNavigation_00ab")}>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" aria-label={uiText("backToSearchResults_69e3")} onClick={() => window.dispatchEvent(new CustomEvent("goose-note:open-search"))}><ArrowLeft size={16}/><span>{uiText("searchResults_098f")}</span></Button>
      <span role="status">{count ? uiText("matchPosition", { current, count }) : titleOnly ? uiText("titleMatch_92f9") : uiText("noMatchesInNoteContent_997e")}</span>
      <IconButton size="xs" className="p-0" aria-label={uiText("previousMatch_cd54")} disabled={!count} onClick={() => step(-1)}><ChevronUp size={16}/></IconButton><IconButton size="xs" className="p-0" aria-label={uiText("nextMatch_98c3")} disabled={!count} onClick={() => step(1)}><ChevronDown size={16}/></IconButton>
      <span className="search-match-message" aria-live="polite">{message}</span>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" disabled={!session.origin?.originPageId || !pages[session.origin?.originPageId]} onClick={() => session.origin?.originPageId && useSearchSession.getState().targetPage(session.origin?.originPageId, true, session.origin.originScrollTop)}>{uiText("backToOriginalNote_7521")}</Button>
      <IconButton size="xs" className="p-0" aria-label={uiText("exitSearch_3633")} onClick={close}><X size={16}/></IconButton>
    </div>
  </>;
}
