import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FolderOpen, Search, X } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarSearchResults } from "./SidebarSearchResults";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useCommandSearch, type SearchResultPage } from "../command/useCommandSearch";
import { matchingSplitPaletteActions } from "../command/splitPaletteActions";
import { useSearchSession } from "./useSearchSession";
import { useSearchScopeHint } from "./useSearchScopeHint";
import { useSearchFolderRefresh } from "./useSearchFolderRefresh";
import type { Page } from "@/types";
import "./sidebar-search.css";

const EMPTY_PAGES: Record<string, Page> = {};

export const SidebarSearch = memo(function SidebarSearch() {
  const session = useSearchSession(useShallow(s => ({
    query: s.query, scope: s.scope, open: s.open, focusNonce: s.focusNonce,
    selectedPageId: s.selectedPageId, startingNotebookId: s.startingNotebookId,
    closeSearch: s.closeSearch, targetPage: s.targetPage, setQuery: s.setQuery,
    setScope: s.setScope,
  })));
  const showScopeHint = useSearchScopeHint(s => s.visible);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRestore = useRef<{ query: string; scope: typeof session.scope; top: number } | null>(null);
  const composing = useRef(false);
  const [draft, setDraft] = useState(session.query);
  const { loading, loadError, retryLoad } = useSearchFolderRefresh(session.open, session.scope);
  const notebooks = useNotebooks(s => s.notebooks);
  const pages = usePages(s => session.open ? s.pages : EMPTY_PAGES);
  const showRecent = useSettings(s => s.showRecentInSearch);
  const setShowRecent = useSettings(s => s.setShowRecentInSearch);
  const scopedId = session.scope.kind === "all" ? null : session.scope.notebookId;
  const { searchResults, deferredQuery, isSearching, searchError, loadMoreResults, removeRecent } = useCommandSearch({ enabled: session.open, searchQuery: session.query, pages, activeNotebookId: scopedId, searchAllNotebooks: session.scope.kind === "all" });
  useEffect(() => { if (!composing.current) setDraft(session.query); }, [session.query]);
  useEffect(() => {
    if (!session.open) return;
    inputRef.current?.focus({ preventScroll: true });
    const latest = useSearchSession.getState();
    scrollRestore.current = { query: latest.query, scope: latest.scope, top: latest.listScrollTop };
  }, [session.open, session.focusNonce]);
  const hasQuery = Boolean(session.query.trim());
  const notebookNames = useMemo(() => Object.fromEntries(Object.values(notebooks).map(n => [n.id, n.name])), [notebooks]);
  const resultHasQuery = Boolean(deferredQuery.trim());
  const results = useMemo(() => resultHasQuery ? searchResults.allDisplay : showRecent ? searchResults.recent : [],
    [resultHasQuery, showRecent, searchResults.allDisplay, searchResults.recent]);
  const pending = isSearching || draft !== session.query || session.query !== deferredQuery;
  useEffect(() => {
    const restore = scrollRestore.current;
    if (!session.open || !restore) return;
    if (restore.query !== session.query || restore.scope !== session.scope) {
      scrollRestore.current = null;
      return;
    }
    if (pending || !results.length || !listRef.current) return;
    listRef.current.scrollTop = restore.top;
    scrollRestore.current = null;
  }, [session.open, session.query, session.scope, pending, results]);
  const selected = results.find(p => p.id === session.selectedPageId) ?? results[0];
  const duplicates = useMemo(() => {
    const seen = new Set<string>(), repeated = new Set<string>();
    for (const page of results) {
      const title = getPageTitle(page);
      if (seen.has(title)) repeated.add(title);
      else seen.add(title);
    }
    return repeated;
  }, [results]);
  const close = () => {
    session.closeSearch();
    window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.sidebar-mode-rail-button[aria-label="搜索"]')?.focus({ preventScroll: true }));
  };
  const clearSearch = () => {
    const input = inputRef.current;
    // End native composition before clearing so its commit cannot restore the query.
    if (composing.current) input?.blur();
    composing.current = false;
    setDraft("");
    session.setQuery("");
    input?.focus({ preventScroll: true });
  };
  const openResult = useCallback((page: SearchResultPage, enter = false) => {
    const latest = useSearchSession.getState();
    if (pending || inputRef.current?.value !== latest.query || composing.current || !latest.open || latest.query !== deferredQuery || latest.scope !== session.scope) return;
    latest.targetPage(page.id, enter);
  }, [deferredQuery, session.scope, pending]);
  const reveal = (id: string) => {
    const list = listRef.current, row = document.getElementById(`search-result-${id}`);
    if (!list || !row) return;
    const a = list.getBoundingClientRect(), b = row.getBoundingClientRect();
    if (b.top < a.top) list.scrollTop += b.top - a.top;
    else if (b.bottom > a.bottom) list.scrollTop += b.bottom - a.bottom;
  };
  const keydown = (event: React.KeyboardEvent) => {
    if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Tab" && event.currentTarget === inputRef.current && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const latest = useSearchSession.getState();
      latest.setScope(latest.scope.kind === "all" ? { kind: "current", notebookId: latest.startingNotebookId } : { kind: "all" });
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
      event.preventDefault();
      if (pending || useSearchSession.getState().query !== deferredQuery) return;
      const index = results.findIndex(p => p.id === selected?.id);
      const next = Math.max(0, Math.min(results.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
      if (next >= results.length - 2 && searchResults.hasMore) loadMoreResults();
      openResult(results[next]); requestAnimationFrame(() => reveal(results[next].id));
    }
    if (event.key === "Enter" && selected && !pending) { event.preventDefault(); openResult(selected, true); }
  };
  const scopeValue = session.scope.kind === "notebook" ? `notebook:${scopedId}` : session.scope.kind;
  const currentName = notebooks[session.startingNotebookId ?? ""]?.name ?? "当前记事本";
  const scopeLabel = session.scope.kind === "all" ? "所有记事本" : session.scope.kind === "current" ? "当前记事本" : notebooks[scopedId ?? ""]?.name ?? "记事本已移除";
  return <section className="sidebar-search" aria-label="全局搜索" hidden={!session.open}>
    <div className="sidebar-search-heading"><strong>搜索笔记</strong></div>
    <div className="sidebar-search-focus-box"><div className="sidebar-search-input-wrap"><Search size={16} aria-hidden="true"/><Input variant="inline" context="shell" className="goose-inline-input" ref={inputRef} role="combobox" aria-label="搜索笔记" aria-describedby={showScopeHint ? "sidebar-search-scope-hint" : undefined} aria-controls="sidebar-search-results" aria-expanded={session.open} aria-autocomplete="list" aria-activedescendant={selected ? `search-result-${selected.id}` : undefined} value={draft} placeholder="搜索笔记内容…" autoComplete="off" spellCheck={false}
      onChange={e => { setDraft(e.target.value); if (!composing.current) session.setQuery(e.target.value); }}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={e => { composing.current = false; session.setQuery(e.currentTarget.value); }} onKeyDown={keydown}/>
      {draft ? <IconButton size="xs" className="p-0" aria-label="清空搜索" onPointerDown={event => { if (event.button !== 0 || !event.isPrimary) return; event.preventDefault(); clearSearch(); }} onClick={clearSearch}><X size={16}/></IconButton> : null}</div>
    <div className="sidebar-search-scope-row">{session.open && <DropdownMenu><DropdownMenuTrigger asChild><Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-search-scope" aria-label={`搜索范围：${scopeLabel}`}><FolderOpen size={14} aria-hidden="true"/><span>{scopeLabel}</span><ChevronDown size={14}/></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64"><DropdownMenuRadioGroup value={scopeValue} onValueChange={value => session.setScope(value === "all" ? { kind: "all" } : value === "current" ? { kind: "current", notebookId: session.startingNotebookId } : { kind: "notebook", notebookId: value.slice(9) })}>
        <DropdownMenuRadioItem value="current">当前记事本 · {currentName}</DropdownMenuRadioItem><DropdownMenuRadioItem value="all">所有记事本</DropdownMenuRadioItem>
        {Object.values(notebooks).map(n => <DropdownMenuRadioItem key={n.id} value={`notebook:${n.id}`}>{n.name}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>}<kbd className="sidebar-search-key" aria-hidden="true"><span>Tab</span></kbd></div></div>
    {showScopeHint && <p id="sidebar-search-scope-hint" className="sidebar-search-scope-hint">按 Tab 切换到{session.scope.kind === "all" ? "当前记事本" : "所有记事本"}</p>}
    <div className="sidebar-search-filters"><span role="status">{searchError ? "" : hasQuery && (loading || pending) ? "搜索中…" : hasQuery ? `${searchResults.all.length} 篇` : ""}</span></div>
    {!hasQuery && showRecent && <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-search-hide-recent" onClick={() => setShowRecent(false)}>隐藏最近访问</Button>}
    {loadError && <div className="sidebar-search-empty" role="alert">部分笔记本读取失败<Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 text-inherit" onClick={retryLoad}>重试读取</Button></div>}
    <div ref={listRef} className="sidebar-search-results" onScroll={e => { if (!useSearchSession.getState().open || scrollRestore.current) return; const el = e.currentTarget; useSearchSession.setState({ listScrollTop: el.scrollTop }); if (hasQuery && searchResults.hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreResults(); }}>
      <div id="sidebar-search-results" className="goose-list-layout" role="listbox" aria-label="搜索结果" tabIndex={0} onKeyDown={keydown} aria-activedescendant={selected ? `search-result-${selected.id}` : undefined}>
      <SidebarSearchResults results={results} query={deferredQuery} selectedId={selected?.id} duplicates={duplicates} notebookNames={notebookNames} openResult={openResult} removeRecent={removeRecent}/>
      </div>
      {searchError && <div className="sidebar-search-empty" role="alert">{searchError}</div>}
      {!searchError && !(hasQuery && (loading || pending)) && !results.length && <div className="sidebar-search-placeholder" role="status">
        <Search size={32} aria-hidden="true"/>
        <strong>{hasQuery ? "未找到相关笔记" : session.scope.kind === "all" ? "搜索所有记事本" : session.scope.kind === "current" ? "搜索当前记事本" : `搜索 ${scopeLabel}`}</strong>
        <p>{hasQuery ? "试试其他关键词，或调整搜索范围" : "输入关键词，查找标题与正文"}</p>
        {hasQuery && <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-1 py-1 text-xs" onClick={() => { if (session.scope.kind !== "all") session.setScope({ kind: "all" }); else clearSearch(); }}>{session.scope.kind !== "all" ? "搜索所有记事本" : "清空搜索"}</Button>}
      </div>}
      {hasQuery && searchResults.hasMore && <Button contentStyle="preserve" variant="ghost" size="sm" className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-search-more" onClick={loadMoreResults}>加载更多结果</Button>}
      {matchingSplitPaletteActions(session.query).map(action => <Button contentStyle="preserve" variant="ghost" size="sm" key={action.id} className="h-auto whitespace-normal border-0 px-0 py-0 goose-list-row sidebar-search-command rounded-lg" onClick={() => { action.run(); session.closeSearch(); }}>{action.label}</Button>)}
    </div>
  </section>;
});
