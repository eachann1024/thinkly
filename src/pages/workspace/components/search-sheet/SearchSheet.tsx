import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Search, X } from "@/components/ui/icons";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { matchingSplitPaletteActions } from "../command/splitPaletteActions";
import { useSearchSession } from "../sidebar/useSearchSession";
import { askNotebookAi } from "../notebook-ai/approval/refinePlan";
import type { SearchResultPage } from "../command/useCommandSearch";
import { AI_ROW_ID, AskAiRow, SearchSheetResults } from "./SearchSheetResults";
import { SearchSheetFilters } from "./SearchSheetFilters";
import { useSheetResults } from "./useSheetResults";
import { useSheetDrag } from "./useSheetDrag";
import "./search-sheet.css";

export const SearchSheet = memo(function SearchSheet({ aiNotebookId }: { aiNotebookId: string | null }) {
  const session = useSearchSession(useShallow(s => ({
    open: s.open, sheetOpen: s.sheetOpen, query: s.query, scope: s.scope, titleOnly: s.titleOnly, sort: s.sort,
    focusNonce: s.focusNonce, closeSearch: s.closeSearch, setQuery: s.setQuery, setScope: s.setScope,
  })));
  const visible = session.open && session.sheetOpen;
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const skipRestore = useRef(false);
  const composing = useRef(false);
  const [draft, setDraft] = useState(session.query);
  const [activeId, setActiveId] = useState<string | null>(null);
  const notebooks = useNotebooks(s => s.notebooks);
  const setShowRecent = useSettings(s => s.setShowRecentInSearch);
  const { results, total, hasMore, pages, loading, loadError, retryLoad, showRecent, deferredQuery, isSearching, searchError, loadMoreResults, removeRecent } = useSheetResults();
  const close = useCallback(() => useSearchSession.getState().closeSearch(), []);
  const drag = useSheetDrag(sheetRef, close);

  useEffect(() => { if (!composing.current) setDraft(session.query); }, [session.query]);
  useEffect(() => { setActiveId(null); listRef.current?.scrollTo({ top: 0 }); }, [deferredQuery, session.scope, session.titleOnly, session.sort]);
  useEffect(() => {
    if (!visible) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !sheetRef.current?.contains(active)) returnFocus.current = active;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [visible, session.focusNonce]);
  useEffect(() => {
    if (visible || session.open) return;
    // 打开结果或转交 AI 时由目标接管焦点，只有直接关闭才归还。
    const target = returnFocus.current;
    returnFocus.current = null;
    if (skipRestore.current) { skipRestore.current = false; return; }
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, [visible, session.open]);

  const hasQuery = Boolean(session.query.trim());
  const pending = isSearching || draft !== session.query || session.query !== deferredQuery;
  const aiQuery = aiNotebookId ? session.query.trim() : "";
  const notebookNames = useMemo(() => Object.fromEntries(Object.values(notebooks).map(n => [n.id, n.name])), [notebooks]);
  const optionIds = useMemo(() => [...(aiQuery ? [AI_ROW_ID] : []), ...results.map(p => p.id)], [aiQuery, results]);
  const selectedId = activeId && optionIds.includes(activeId) ? activeId : results[0]?.id ?? optionIds[0];

  const askAi = () => {
    if (!aiNotebookId || !aiQuery) return;
    skipRestore.current = true;
    session.closeSearch();
    askNotebookAi({ notebookId: aiNotebookId, text: aiQuery });
  };
  const openResult = useCallback((page: SearchResultPage) => {
    const latest = useSearchSession.getState();
    if (pending || composing.current || !latest.open || latest.query !== deferredQuery || latest.scope !== session.scope) return;
    returnFocus.current = null;
    latest.targetPage(page.id, true);
    latest.hideSheet();
  }, [deferredQuery, session.scope, pending]);
  const clearSearch = () => {
    if (composing.current) inputRef.current?.blur();
    composing.current = false;
    setDraft("");
    session.setQuery("");
    inputRef.current?.focus({ preventScroll: true });
  };
  const reveal = (id: string) => document.getElementById(id === AI_ROW_ID ? id : `search-result-${id}`)?.scrollIntoView({ block: "nearest" });
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!sheetRef.current?.contains(event.target as Node)) return;
    if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.target !== inputRef.current) return;
    if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const latest = useSearchSession.getState();
      latest.setScope(latest.scope.kind === "all" ? { kind: "current", notebookId: latest.startingNotebookId } : { kind: "all" });
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && optionIds.length) {
      event.preventDefault();
      const index = optionIds.indexOf(selectedId ?? "");
      const next = Math.max(0, Math.min(optionIds.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
      if (next >= optionIds.length - 2 && hasMore) loadMoreResults();
      setActiveId(optionIds[next]);
      requestAnimationFrame(() => reveal(optionIds[next]));
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.shiftKey || selectedId === AI_ROW_ID) { askAi(); return; }
    const page = results.find(p => p.id === selectedId);
    if (page) openResult(page);
  };

  const busy = hasQuery && (loading || pending);
  const scopeAll = session.scope.kind === "all";
  const count = searchError || !hasQuery ? "" : busy ? "搜索中…" : `${total} 篇`;
  return <div className="search-sheet-layer" data-open={visible} onKeyDown={keydown}>
    <div className="search-sheet-scrim" aria-hidden="true" onClick={close}/>
    <div ref={sheetRef} className="search-sheet" role={visible ? "dialog" : undefined} aria-modal={visible || undefined} aria-label="搜索笔记" inert={!visible} data-dragging={drag.dragging}
      style={drag.offset ? { "--search-sheet-drag": `${drag.offset}px` } as CSSProperties : undefined}>
      <div className="search-sheet-grab" aria-hidden="true" {...drag.handlers}/>
      <div className="search-sheet-query">
        <Search size={20} aria-hidden="true"/>
        <Input variant="inline" context="shell" className="goose-inline-input" ref={inputRef} role="combobox" aria-label="搜索笔记" aria-controls="search-sheet-results" aria-expanded={visible} aria-autocomplete="list" aria-activedescendant={selectedId ? (selectedId === AI_ROW_ID ? AI_ROW_ID : `search-result-${selectedId}`) : undefined}
          value={draft} placeholder="搜索笔记、提问 AI…" autoComplete="off" spellCheck={false}
          onChange={e => { setDraft(e.target.value); if (!composing.current) session.setQuery(e.target.value); }}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={e => { composing.current = false; session.setQuery(e.currentTarget.value); }}/>
        {draft ? <IconButton size="xs" className="p-0" aria-label="清空搜索" onClick={clearSearch}><X size={16}/></IconButton> : <kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd>}
      </div>
      <SearchSheetFilters count={count}/>
      <div ref={listRef} className="search-sheet-list" onScroll={e => { const el = e.currentTarget; if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreResults(); }}>
        <div id="search-sheet-results" role="listbox" aria-label="搜索结果">
          {aiQuery && <AskAiRow query={aiQuery} selected={selectedId === AI_ROW_ID} onAsk={askAi}/>}
          {!hasQuery && showRecent && results.length > 0 && <div className="search-sheet-label"><span>最近访问</span><Button contentStyle="preserve" variant="ghost" size="sm" onClick={() => setShowRecent(false)}>隐藏</Button></div>}
          {hasQuery && results.length > 0 && <div className="search-sheet-label"><span>笔记</span></div>}
          <SearchSheetResults results={results} query={deferredQuery} selectedId={selectedId} notebookNames={notebookNames} pages={pages} openResult={openResult} removeRecent={removeRecent}/>
        </div>
        {loadError && <div className="search-sheet-status" role="alert">部分笔记本读取失败<Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={retryLoad}>重试读取</Button></div>}
        {searchError && <div className="search-sheet-status" role="alert">{searchError}</div>}
        {!searchError && !busy && !results.length && <div className="search-sheet-status" role="status">
          <strong>{hasQuery ? "未找到相关笔记" : scopeAll ? "搜索所有记事本" : "搜索当前记事本"}</strong>
          {hasQuery && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={() => scopeAll ? clearSearch() : session.setScope({ kind: "all" })}>{scopeAll ? "清空搜索" : "搜索所有记事本"}</Button>}
        </div>}
        {hasMore && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={loadMoreResults}>加载更多结果</Button>}
        {matchingSplitPaletteActions(session.query).map(action => <Button contentStyle="preserve" variant="ghost" size="sm" key={action.id} className="search-sheet-link" onClick={() => { action.run(); close(); }}>{action.label}</Button>)}
      </div>
      <div className="search-sheet-footer" aria-hidden="true">
        <span><kbd className="search-sheet-kbd">↑↓</kbd>选择</span>
        <span><kbd className="search-sheet-kbd">↵</kbd>打开</span>
        {aiNotebookId && <span><kbd className="search-sheet-kbd">⇧↵</kbd>询问 AI</span>}
        <span><kbd className="search-sheet-kbd">Tab</kbd>切换范围</span>
      </div>
    </div>
  </div>;
});
