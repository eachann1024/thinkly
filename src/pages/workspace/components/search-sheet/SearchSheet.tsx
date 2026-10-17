import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheet.tsx#localMessages:1">`
zh-Hans:
  searching: "搜索中…"
  noteCount: "{{count}} 篇"
  searchNotes: "搜索笔记…"
  searchNotesOrAskAi: "搜索笔记、提问 AI…"
  clearSearch: "清空搜索"
  searchResults: "搜索结果"
  recentlyOpened: "最近访问"
  hide: "隐藏"
  notes: "笔记"
  someNotebooksCouldnTBeRead: "部分笔记本读取失败"
  tryAgain: "重试读取"
  noMatchingNotes: "未找到相关笔记"
  searchAllNotebooks: "搜索所有笔记本"
  searchCurrentNotebook: "搜索当前笔记本"
  enableAiAnswers: "启用 AI 问答"
  loadMoreResults: "加载更多结果"
  select: "选择"
  open: "打开"
  askAi: "询问 AI"
  changeScope: "切换范围"
en:
  searching: "Searching…"
  noteCount: "Notes: {{count}}"
  searchNotes: "Search notes…"
  searchNotesOrAskAi: "Search notes or ask AI…"
  clearSearch: "Clear search"
  searchResults: "Search results"
  recentlyOpened: "Recently opened"
  hide: "Hide"
  notes: "Notes"
  someNotebooksCouldnTBeRead: "Some notebooks couldn’t be read"
  tryAgain: "Try again"
  noMatchingNotes: "No matching notes"
  searchAllNotebooks: "Search all notebooks"
  searchCurrentNotebook: "Search current notebook"
  enableAiAnswers: "Enable AI answers"
  loadMoreResults: "Load more results"
  select: "Select"
  open: "Open"
  askAi: "Ask AI"
  changeScope: "Change scope"
`;
const uiText = createTranslator(localMessages);
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { CircleAlert, FileX, Search, Sparkles, X } from "@/components/ui/icons";
import { OverlayLayerProvider, useModalLayer } from "@/components/ui/overlay-layer";
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
import { useSearchAiAvailable, useSheetAnswer } from "./useSheetAnswer";
import { SearchSheetAnswer } from "./SearchSheetAnswer";
import "./search-sheet.css";

export const SearchSheet = memo(function SearchSheet({ aiNotebookId }: { aiNotebookId: string | null }) {
  const session = useSearchSession(useShallow(s => ({
    open: s.view.phase !== "closed", sheetOpen: s.view.phase === "sheet", query: s.query, scope: s.scope, titleOnly: s.titleOnly, sort: s.sort,
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
  const { results, total, hasMore, pages, loading, loadError, retryLoad, showRecent, deferredQuery, isSearching, searchError, loadMoreResults, removeRecent, getCandidates, searchResults } = useSheetResults();
  const aiReady = useSearchAiAvailable();
  const { answer, ask, reset: resetAnswer } = useSheetAnswer();
  const layer = useModalLayer(visible);
  const close = useCallback(() => useSearchSession.getState().closeSearch(), []);
  const drag = useSheetDrag(sheetRef, close);

  useEffect(() => { if (!composing.current) setDraft(session.query); }, [session.query]);
  useEffect(() => { if (!visible) resetAnswer(); }, [visible, resetAnswer]);
  useEffect(() => { if (answer && answer.question !== session.query.trim()) resetAnswer(); }, [answer, session.query, resetAnswer]);
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
  const aiQuery = aiReady ? session.query.trim() : "";
  const notebookNames = useMemo(() => Object.fromEntries(Object.values(notebooks).map(n => [n.id, n.name])), [notebooks]);
  const optionIds = useMemo(() => [...(aiQuery ? [AI_ROW_ID] : []), ...results.map(p => p.id)], [aiQuery, results]);
  const selectedId = activeId && optionIds.includes(activeId) ? activeId : results[0]?.id ?? optionIds[0];

  const openAiSettings = () => { close(); window.dispatchEvent(new CustomEvent("goose-note:open-settings", { detail: { tab: "ai" } })); };
  const askAi = () => { if (aiQuery) void ask(aiQuery, getCandidates(), searchResults.all); };
  const continueInPanel = aiNotebookId && answer ? () => {
    skipRestore.current = true;
    session.closeSearch();
    askNotebookAi({ notebookId: aiNotebookId, text: answer.question });
  } : undefined;
  const openSource = (id: string) => {
    returnFocus.current = null;
    const latest = useSearchSession.getState();
    latest.targetPage(id, true);
  };
  const openResult = useCallback((page: SearchResultPage) => {
    const latest = useSearchSession.getState();
    if (pending || composing.current || latest.view.phase === "closed" || latest.query !== deferredQuery || latest.scope !== session.scope) return;
    returnFocus.current = null;
    latest.targetPage(page.id, true);
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
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (answer) resetAnswer(); else close(); return; }
    if (event.target !== inputRef.current) return;
    if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const latest = useSearchSession.getState();
      latest.setScope(latest.scope.kind === "all" ? { kind: "current", notebookId: latest.view.phase !== "closed" ? latest.view.context.startingNotebookId : null } : { kind: "all" });
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && optionIds.length && !answer) {
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
    if (answer) return;
    if ((event.shiftKey && aiQuery) || selectedId === AI_ROW_ID) { askAi(); return; }
    const page = results.find(p => p.id === selectedId);
    if (page) openResult(page);
  };

  const busy = hasQuery && (loading || pending);
  const scopeAll = session.scope.kind === "all";
  const statusKind = searchError ? "error" : busy || results.length ? null : hasQuery ? "none" : "empty";
  const resultsKey = `${deferredQuery}|${session.scope.kind}|${session.titleOnly}|${session.sort}`;
  const count = searchError || !hasQuery ? "" : busy ? uiText("searching") : uiText("noteCount", {count: total});
  return <OverlayLayerProvider layer={layer}><div className="search-sheet-layer" data-open={visible} style={{ zIndex: layer }} onKeyDown={keydown}>
    <div className="search-sheet-scrim" aria-hidden="true" onClick={close}/>
    <div ref={sheetRef} className="search-sheet" role={visible ? "dialog" : undefined} aria-modal={visible || undefined} aria-label={uiText("searchNotes")} inert={!visible} data-dragging={drag.dragging}
      style={drag.offset ? { "--search-sheet-drag": `${drag.offset}px` } as CSSProperties : undefined}>
      <div className="search-sheet-grab" aria-hidden="true" {...drag.handlers}/>
      <div className="search-sheet-query">
        <Search size={20} aria-hidden="true"/>
        <Input variant="inline" context="shell" className="goose-inline-input" ref={inputRef} role="combobox" aria-label={uiText("searchNotes")} aria-controls="search-sheet-results" aria-expanded={visible} aria-autocomplete="list" aria-activedescendant={selectedId ? (selectedId === AI_ROW_ID ? AI_ROW_ID : `search-result-${selectedId}`) : undefined}
          value={draft} placeholder={aiReady ? uiText("searchNotesOrAskAi") : uiText("searchNotes")} autoComplete="off" spellCheck={false}
          onChange={e => { setDraft(e.target.value); if (!composing.current) session.setQuery(e.target.value); }}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={e => { composing.current = false; session.setQuery(e.currentTarget.value); }}/>
        {draft ? <IconButton size="xs" className="p-0" aria-label={uiText("clearSearch")} onClick={clearSearch}><X size={16}/></IconButton> : <kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd>}
      </div>
      <SearchSheetFilters count={count}/>
      {answer ? <div className="search-sheet-list" data-answer="true">
        <SearchSheetAnswer answer={answer} onBack={resetAnswer} onOpenSource={openSource} onContinue={continueInPanel}/>
      </div> : <div key={session.focusNonce} ref={listRef} className="search-sheet-list" onScroll={e => { const el = e.currentTarget; if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreResults(); }}>
        <div key={resultsKey} id="search-sheet-results" className="search-sheet-results" role="listbox" aria-label={uiText("searchResults")}>
          {aiQuery && <AskAiRow query={aiQuery} selected={selectedId === AI_ROW_ID} onAsk={askAi}/>}
          {!hasQuery && showRecent && results.length > 0 && <div className="search-sheet-label"><span>{uiText("recentlyOpened")}</span><Button contentStyle="preserve" variant="ghost" size="sm" onClick={() => setShowRecent(false)}>{uiText("hide")}</Button></div>}
          {hasQuery && results.length > 0 && <div className="search-sheet-label"><span>{uiText("notes")}</span></div>}
          <SearchSheetResults results={results} query={deferredQuery} selectedId={selectedId} notebookNames={notebookNames} pages={pages} openResult={openResult} removeRecent={removeRecent}/>
        </div>
        {loadError && <div className="search-sheet-status" role="alert">{uiText("someNotebooksCouldnTBeRead")}<Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={retryLoad}>{uiText("tryAgain")}</Button></div>}
        {statusKind && <div key={statusKind} className="search-sheet-status" role={statusKind === "error" ? "alert" : "status"} data-state={statusKind}>
          <span className="search-sheet-status-glyph" aria-hidden="true">{statusKind === "error" ? <CircleAlert size={20}/> : statusKind === "none" ? <FileX size={20}/> : <Search size={20}/>}</span>
          <strong>{statusKind === "error" ? searchError : statusKind === "none" ? uiText("noMatchingNotes") : scopeAll ? uiText("searchAllNotebooks") : uiText("searchCurrentNotebook")}</strong>
          {statusKind === "none" && <div className="search-sheet-status-actions">
            <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" onClick={() => scopeAll ? clearSearch() : session.setScope({ kind: "all" })}>{scopeAll ? uiText("clearSearch") : uiText("searchAllNotebooks")}</Button>
            {!aiReady && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" data-quiet="true" onClick={openAiSettings}><Sparkles size={14} aria-hidden="true"/>{uiText("enableAiAnswers")}</Button>}
          </div>}
        </div>}
        {hasMore && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={loadMoreResults}>{uiText("loadMoreResults")}</Button>}
        {matchingSplitPaletteActions(session.query).map(action => <Button contentStyle="preserve" variant="ghost" size="sm" key={action.id} className="search-sheet-link" onClick={() => { action.run(); close(); }}>{action.label}</Button>)}
      </div>}
      <div className="search-sheet-footer" aria-hidden="true">
        <span><kbd className="search-sheet-kbd">↑↓</kbd>{uiText("select")}</span>
        <span><kbd className="search-sheet-kbd">↵</kbd>{uiText("open")}</span>
        {aiReady && <span><kbd className="search-sheet-kbd">⇧↵</kbd>{uiText("askAi")}</span>}
        <span><kbd className="search-sheet-kbd">Tab</kbd>{uiText("changeScope")}</span>
      </div>
    </div>
  </div></OverlayLayerProvider>;
});
