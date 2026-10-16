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

export function SearchEditorBridge({ pageId, focused, editorRef, scrollRef, cancelPendingRestoration }: {
  pageId: string; focused: boolean; editorRef: RefObject<EditorRef | null>; scrollRef: RefObject<HTMLDivElement | null>;
  cancelPendingRestoration: () => void;
}) {
  const session = useSearchSession(useShallow(s => ({
    open: s.open, query: s.query, scope: s.scope, requestNonce: s.requestNonce, originPageId: s.originPageId,
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
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.sidebar-mode-rail-button[aria-label="搜索"]')?.focus({ preventScroll: true }));
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
      if (!useSearchSession.getState().open || editor._tiptapEditor.isDestroyed || editorRef.current?.editor !== editor || editor.prosemirrorView.dom.dataset.searchPageId !== pageId) return;
      const scroller = scrollRef.current;
      const target = (editor.prosemirrorView.dom as HTMLElement).querySelector<HTMLElement>(".goose-search-session-match--current");
      if (!scroller || !target) return;
      const hit = target.getBoundingClientRect(), box = scroller.getBoundingClientRect();
      scroller.scrollTop += hit.top - box.top - scroller.clientHeight / 2 + hit.height / 2;
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
    setMessage(delta > 0 && next === 0 ? "已回到第一处" : delta < 0 && next === value.matches.length - 1 ? "已回到最后一处" : "");
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
      if (latest.query !== session.query || latest.scope !== session.scope || latest.open !== session.open) return;
      const previous = getSearchSessionHighlightState(editor);
      const query = visible ? session.query.trim() : "";
      if (previous?.query !== query) {
        const saved = useSearchSession.getState().memories[key] ?? 0;
        setSearchSessionHighlightQuery(editor, query, false, saved);
      }
      const state = getSearchSessionHighlightState(editor);
      setCount(state?.matches.length ?? 0); setCurrent((state?.current ?? -1) + 1);
      const request = useSearchSession.getState();
      if (visible && request.targetPageId === pageId && request.requestNonce !== handled.current) {
        handled.current = request.requestNonce;
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
    const navigation = useSearchSession.getState();
    const immediate = !visible || !session.query.trim() ||
      (navigation.targetPageId === pageId && navigation.requestNonce !== handled.current);
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
  crumbs.unshift(notebooks[page.workspaceId]?.name ?? "笔记本");
  const titleOnly = !count && session.query.trim() && getPageTitle(page).toLowerCase().includes(session.query.trim().toLowerCase());
  return <>
    <div className="search-editor-path"><Popover open={pathOpen} onOpenChange={setPathOpen}><PopoverTrigger asChild><Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" aria-label="查看笔记完整路径" title={crumbs.join(" / ")}>{crumbs.length > 2 ? `${crumbs[0]} / ${crumbs.at(-2)}` : crumbs.join(" / ")}</Button></PopoverTrigger><PopoverContent align="end" className="max-w-[min(24rem,85vw)] break-words text-sm">{crumbs.join(" / ")}</PopoverContent></Popover></div>
    <div className="search-editor-matchbar" aria-label="搜索命中导航">
      <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" aria-label="返回搜索结果" onClick={() => window.dispatchEvent(new CustomEvent("goose-note:open-search"))}><ArrowLeft size={16}/><span>搜索结果</span></Button>
      <span role="status">{count ? `${current} / ${count} 处` : titleOnly ? "标题匹配" : "正文无匹配"}</span>
      <IconButton size="xs" className="p-0" aria-label="上一处匹配" disabled={!count} onClick={() => step(-1)}><ChevronUp size={16}/></IconButton><IconButton size="xs" className="p-0" aria-label="下一处匹配" disabled={!count} onClick={() => step(1)}><ChevronDown size={16}/></IconButton>
      <span className="search-match-message" aria-live="polite">{message}</span>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" disabled={!session.originPageId || !pages[session.originPageId]} onClick={() => session.originPageId && useSearchSession.getState().targetPage(session.originPageId, true, useSearchSession.getState().originScrollTop)}>返回起始笔记</Button>
      <IconButton size="xs" className="p-0" aria-label="退出搜索" onClick={close}><X size={16}/></IconButton>
    </div>
  </>;
}
