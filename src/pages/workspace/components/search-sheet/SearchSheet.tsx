import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheet.tsx#localMessages:1">`
zh-Hans:
  searching: "搜索中…"
  noteCount: "{{count}} 篇"
  searchNotes: "搜索笔记…"
  searchNotesOrAskAi: "搜索笔记，/ 调用 Skill，@ 引用笔记或文件…"
  newLine: "换行"
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
  splitOpen: "分屏"
  askAi: "询问 AI"
  switchScope: "切换"
  switchScopeHint: "切换{{name}}"
  allNotebooks: "所有笔记本"
  currentNotebook: "当前笔记本"
en:
  searching: "Searching…"
  noteCount: "Notes: {{count}}"
  searchNotes: "Search notes…"
  searchNotesOrAskAi: "Search notes, / for skills, @ for notes or files…"
  newLine: "New line"
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
  splitOpen: "Split"
  askAi: "Ask AI"
  switchScope: "Switch to"
  switchScopeHint: "Switch to {{name}}"
  allNotebooks: "all notebooks"
  currentNotebook: "Current notebook"
ja:
  searching: "検索中…"
  noteCount: "{{count}} 件"
  searchNotes: "ノートを検索…"
  searchNotesOrAskAi: "ノートを検索、/ でスキル、@ でノートやファイル…"
  newLine: "改行"
  clearSearch: "検索をクリア"
  searchResults: "検索結果"
  recentlyOpened: "最近開いた項目"
  hide: "非表示"
  notes: "ノート"
  someNotebooksCouldnTBeRead: "一部のノートブックを読み込めませんでした"
  tryAgain: "再読み込み"
  noMatchingNotes: "該当するノートがありません"
  searchAllNotebooks: "すべてのノートブックを検索"
  searchCurrentNotebook: "現在のノートブックを検索"
  enableAiAnswers: "AI による回答を有効にする"
  loadMoreResults: "さらに読み込む"
  select: "選択"
  open: "開く"
  splitOpen: "分割"
  askAi: "AI に質問"
  switchScope: "切り替え"
  switchScopeHint: "{{name}}に切り替え"
  allNotebooks: "すべてのノートブック"
  currentNotebook: "現在のノートブック"
`;
const uiText = createTranslator(localMessages);
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Search, Sparkles, X } from "@/components/ui/icons";
import { DotDecor, DotIconArt, EmptyStateArt } from "@/components/ui/dot-matrix";

import { OverlayLayerProvider, useModalLayer } from "@/components/ui/overlay-layer";
import { SkeletonList } from "@/components/ui/skeleton";
import type { SearchWindowCommand } from "@/lib/electron/searchWindow";
import { formatShortcut } from "@/lib/utils";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { matchingSplitPaletteActions } from "../command/splitPaletteActions";
import { useSearchSession } from "../sidebar/useSearchSession";
import { AI_ROW_ID, AskAiRow, SearchSheetResults } from "./SearchSheetResults";
import { SearchSheetFilters } from "./SearchSheetFilters";
import { useSheetResults } from "./useSheetResults";
import type { SearchFolderSource } from "../sidebar/useSearchFolderRefresh";
import { useSheetDrag } from "./useSheetDrag";
import { SearchSheetQuery, type SearchSheetQueryHandle } from "./SearchSheetQuery";
import type { ComposerSlashBuiltinId } from "@/lib/notebook-ai/composerSlashCommands";
import { requestAiSlashCommand } from "../notebook-ai/session/slashCommandRequest";
import { searchAiEmptyChrome } from "./searchAiChrome";
import { useSearchAiAvailable, useSheetAnswer } from "./useSheetAnswer";
import { SearchSheetAnswer } from "./SearchSheetAnswer";
import { handleSearchSheetKeyDown, handleSearchSheetKeyDownCapture } from "./searchSheetKeyboard";
import { useSheetActions } from "./useSheetActions";
import "./search-sheet.css";

/** variant="window"：浮动搜索窗铺满窗口；打开结果、续聊、设置与分屏交给主窗。 */
type SearchSheetProps = {
  aiNotebookId: string | null;
  variant?: "sheet" | "window";
  onOpenResult?: (page: { id: string; localFilePath?: string }) => void;
  onCommand?: (command: SearchWindowCommand) => void;
  onClose?: () => void;
  folderSource?: SearchFolderSource;
};

export const SearchSheet = memo(function SearchSheet({ aiNotebookId, variant = "sheet", onOpenResult, onCommand, onClose, folderSource }: SearchSheetProps) {
  useLocale();
  const session = useSearchSession(useShallow(s => ({
    open: s.view.phase !== "closed", sheetOpen: s.view.phase === "sheet", query: s.query, scope: s.scope, titleOnly: s.titleOnly, sort: s.sort,
    startingNotebookId: s.view.phase !== "closed" ? s.view.context.startingNotebookId : null,
    focusNonce: s.focusNonce, closeSearch: s.closeSearch, setQuery: s.setQuery, setScope: s.setScope,
  })));
  const windowed = variant === "window";
  const visible = session.open && session.sheetOpen;
  const sheetRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<SearchSheetQueryHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const answerListRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const skipRestore = useRef(false);
  const composing = useRef(false);
  const focusSeen = useRef(session.focusNonce);
  const [prompt, setPrompt] = useState(session.query);
  const [queryEmpty, setQueryEmpty] = useState(!session.query.trim());
  const [menu, setMenu] = useState<null | "mention" | "command">(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  if (focusSeen.current !== session.focusNonce) {
    focusSeen.current = session.focusNonce;
    const next = session.query.trim();
    if (prompt !== next) setPrompt(next);
    if (queryEmpty !== !next) setQueryEmpty(!next);
  }
  const notebooks = useNotebooks(s => s.notebooks);
  const setShowRecent = useSettings(s => s.setShowRecentInSearch);
  const { results, total, hasMore, pages, loading, loadError, retryLoad, showRecent, deferredQuery, isSearching, searchError, loadMoreResults, removeRecent, getCandidates, searchResults } = useSheetResults(folderSource);
  const ai = useSearchAiAvailable();
  const { answer, ask, reset: resetAnswer } = useSheetAnswer();
  const layer = useModalLayer(visible);
  const endSearch = useCallback(() => onClose ? onClose() : useSearchSession.getState().closeSearch(), [onClose]);
  const dismissSheet = useCallback(() => onClose ? onClose() : useSearchSession.getState().dismissSheet(), [onClose]);
  const drag = useSheetDrag(sheetRef, dismissSheet, visible && !windowed);

  const onSearchText = useCallback((text: string) => { if (useSearchSession.getState().query !== text) useSearchSession.getState().setQuery(text); }, []);
  const onPromptChange = useCallback((next: string) => setPrompt(current => current === next ? current : next), []);
  const getQuestion = useCallback(() => queryRef.current?.getQuestion() ?? "", []);
  useEffect(() => { if (!visible) resetAnswer(); }, [visible, resetAnswer]);
  useEffect(() => { if (answer && answer.question !== prompt.trim()) resetAnswer(); }, [answer, prompt, resetAnswer]);
  useEffect(() => { setActiveId(null); listRef.current?.scrollTo({ top: 0 }); }, [deferredQuery, session.scope, session.titleOnly, session.sort]);
  useEffect(() => {
    if (!visible) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !sheetRef.current?.contains(active)) returnFocus.current = active;
    queryRef.current?.focus(true);
  }, [visible, session.focusNonce]);
  useEffect(() => {
    if (visible || session.open) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (skipRestore.current) { skipRestore.current = false; return; }
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, [visible, session.open]);

  const hasQuery = Boolean(session.query.trim());
  const pending = isSearching || session.query !== deferredQuery;
  const aiChrome = searchAiEmptyChrome(ai);
  const menuOpen = menu !== null;
  const aiQuery = menu === "command" || !aiChrome.showAsk ? "" : prompt.trim();
  const notebookNames = useMemo(() => Object.fromEntries(Object.values(notebooks).map(n => [n.id, n.name])), [notebooks]);
  const optionIds = useMemo(() => [...(aiQuery ? [AI_ROW_ID] : []), ...results.map(p => p.id)], [aiQuery, results]);
  const selectedId = menuOpen ? undefined : activeId && optionIds.includes(activeId) ? activeId : results[0]?.id ?? optionIds[0];

  const openAiSettings = () => {
    if (onCommand) { onCommand({ type: "open-settings", tab: "ai" }); return; }
    endSearch();
    window.dispatchEvent(new CustomEvent("goose-note:open-settings", { detail: { tab: "ai" } }));
  };
  const { askAi, continueInPanel, openSource, openResult } = useSheetActions({
    aiNotebookId, aiQuery, getQuestion, notebookNames, getCandidates, ranked: searchResults.all, answer, ask, pending, deferredQuery,
    scope: session.scope, composingRef: composing, returnFocusRef: returnFocus, skipRestoreRef: skipRestore, onOpenResult, onCommand,
  });
  const confirmSelection = () => {
    if (answer) return;
    if (selectedId === AI_ROW_ID) { askAi(); return; }
    const page = results.find(p => p.id === selectedId);
    if (page) openResult(page);
  };
  const clearSearch = () => {
    composing.current = false;
    queryRef.current?.clear();
    setPrompt("");
    setQueryEmpty(true);
    if (useSearchSession.getState().query) session.setQuery("");
    queryRef.current?.focus();
  };
  const reveal = (id: string) => document.getElementById(id === AI_ROW_ID ? id : `search-result-${id}`)?.scrollIntoView({ block: "nearest" });
  const keyContext = {
    answer, selectedId, results, optionIds, hasMore, aiRowId: AI_ROW_ID,
    composingRef: composing, suggestionsOpen: menuOpen,
    containsQueryTarget: (target: EventTarget | null) => queryRef.current?.containsTarget(target) ?? false,
    containsSheetTarget: (target: EventTarget | null) => sheetRef.current?.contains(target as Node) ?? false,
    continueInPanel, onCommand, endSearch, resetAnswer, dismissSheet, loadMoreResults, setActiveId, confirmSelection, reveal,
  };
  const keydownCapture = (event: KeyboardEvent<HTMLDivElement>) => handleSearchSheetKeyDownCapture(event, keyContext);
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => handleSearchSheetKeyDown(event, keyContext);

  const busy = hasQuery && (loading || pending);
  const scopeAll = session.scope.kind === "all";
  const tabScopeName = scopeAll ? notebooks[session.startingNotebookId ?? ""]?.name || uiText("currentNotebook") : uiText("allNotebooks");
  // 尚无可展示的行时用骨架占位；保留旧结果刷新时不替换。
  const awaitingRows = !searchError && !results.length && (busy || (!hasQuery && showRecent && isSearching));
  const statusKind = searchError ? "error" : awaitingRows || results.length ? null : hasQuery ? "none" : "empty";
  const count = searchError || !hasQuery ? "" : busy ? uiText("searching") : uiText("noteCount", {count: total});
  const mentionNotebookId = session.scope.kind === "all" ? session.startingNotebookId ?? aiNotebookId : session.scope.notebookId ?? aiNotebookId;
  return <OverlayLayerProvider layer={layer}><div className="search-sheet-layer" data-open={visible} data-variant={variant} style={{ zIndex: layer }} onKeyDownCapture={keydownCapture} onKeyDown={keydown}>
    {!windowed && <div className="search-sheet-scrim" aria-hidden="true" onClick={dismissSheet}/>}
    <div ref={sheetRef} className="search-sheet" role={visible ? "dialog" : undefined} aria-modal={visible || undefined} aria-label={uiText("searchNotes")} inert={!visible} data-dragging={drag.dragging}>
      {!windowed && <div className="search-sheet-grab" aria-hidden="true" {...drag.handlers}/>}
      <div className="search-sheet-query">
        <Search size={20} aria-hidden="true"/>
        <SearchSheetQuery key={session.focusNonce} ref={queryRef} seed={session.query} placeholder={uiText("searchNotesOrAskAi")} label={uiText("searchNotes")}
          notebookId={mentionNotebookId} scopeAll={scopeAll} listId="search-sheet-results" expanded={visible}
          activeDescendant={selectedId ? (selectedId === AI_ROW_ID ? AI_ROW_ID : `search-result-${selectedId}`) : undefined}
          composingRef={composing} onSearchText={onSearchText} onPrompt={onPromptChange} onSubmit={confirmSelection} onOpenResult={onOpenResult}
          onSuggestions={setMenu} onSlashCommand={(id: ComposerSlashBuiltinId) => {
            if (onCommand) { onCommand({ type: "ai-slash", id }); return; }
            skipRestore.current = true;
            dismissSheet();
            requestAiSlashCommand(id);
          }}
          onEscape={() => { if (answer) resetAnswer(); else dismissSheet(); }} onEmptyChange={setQueryEmpty}/>
        {queryEmpty ? <kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd> : <IconButton size="xs" className="p-0" aria-label={uiText("clearSearch")} onClick={clearSearch}><X size={16}/></IconButton>}
      </div>
      <SearchSheetFilters count={count}/>
      {answer ? <div ref={answerListRef} className="search-sheet-list" data-answer="true">
        <SearchSheetAnswer key={answer.requestId} answer={answer} scrollRef={answerListRef} onBack={resetAnswer} onOpenSource={openSource} onContinue={continueInPanel}/>
      </div> : <div key={session.focusNonce} ref={listRef} className="search-sheet-list" onScroll={e => { const el = e.currentTarget; if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreResults(); }}>
        <div key={deferredQuery} id="search-sheet-results" className="search-sheet-results" role="listbox" aria-label={uiText("searchResults")}>
          {aiQuery && <AskAiRow query={aiQuery} selected={selectedId === AI_ROW_ID} onAsk={askAi}/>}
          {!hasQuery && showRecent && results.length > 0 && <div className="search-sheet-label"><span>{uiText("recentlyOpened")}</span><Button contentStyle="preserve" variant="ghost" size="sm" onClick={() => onCommand ? onCommand({ type: "hide-recent" }) : setShowRecent(false)}>{uiText("hide")}</Button></div>}
          {hasQuery && results.length > 0 && <div className="search-sheet-label"><span>{uiText("notes")}</span></div>}
          <SearchSheetResults results={results} query={deferredQuery} selectedId={selectedId} notebookNames={notebookNames} pages={pages} openResult={openResult} removeRecent={removeRecent}/>
        </div>
        {awaitingRows && visible && <SkeletonList label={uiText("searching")}/>}
        {loadError && <div className="search-sheet-status" role="alert">{uiText("someNotebooksCouldnTBeRead")}<Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={retryLoad}>{uiText("tryAgain")}</Button></div>}
        {statusKind && <div key={statusKind} className="search-sheet-status" role={statusKind === "error" ? "alert" : "status"} data-state={statusKind}>
          <DotDecor preset="search"/>
          <span className="search-sheet-status-art" aria-hidden="true">{statusKind === "empty" ? <DotIconArt icon="search" motion="idle" size={52} width={136} height={92} halo/> : <EmptyStateArt kind={statusKind === "none" ? "noResults" : "searchError"} />}</span>
          <strong>{statusKind === "error" ? searchError : statusKind === "none" ? uiText("noMatchingNotes") : scopeAll ? uiText("searchAllNotebooks") : uiText("searchCurrentNotebook")}</strong>
          {statusKind === "none" && <div className="search-sheet-status-actions">
            <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" onClick={() => scopeAll ? clearSearch() : session.setScope({ kind: "all" })}>{scopeAll ? uiText("clearSearch") : uiText("searchAllNotebooks")}</Button>
            {aiChrome.showEnable && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" data-quiet="true" onClick={openAiSettings}><Sparkles size={14} aria-hidden="true"/>{uiText("enableAiAnswers")}</Button>}
          </div>}
        </div>}
        {hasMore && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-link" onClick={loadMoreResults}>{uiText("loadMoreResults")}</Button>}
        {matchingSplitPaletteActions(session.query).map(action => <Button contentStyle="preserve" variant="ghost" size="sm" key={action.id} className="search-sheet-link" onClick={() => onCommand ? onCommand({ type: "split", action: action.id }) : (action.run(), endSearch())}>{action.label}</Button>)}
      </div>}
      <div className="search-sheet-footer" data-hidden={answer ? "true" : undefined} aria-hidden="true">
        <div className="search-sheet-footer-inner">
          <span><kbd className="search-sheet-kbd">↑↓</kbd>{uiText("select")}</span>
          <span><kbd className="search-sheet-kbd">↵</kbd>{uiText("open")}</span>
          <span><kbd className="search-sheet-kbd">{formatShortcut("Mod")}↑↓←→</kbd>{uiText("splitOpen")}</span>
          <span><kbd className="search-sheet-kbd">⇧↵</kbd>{uiText("newLine")}</span>
          <span className="search-sheet-scope-hint" title={uiText("switchScopeHint", {name: tabScopeName})}><kbd className="search-sheet-kbd">Tab</kbd>{uiText("switchScope")}<span className="search-sheet-scope-name">{tabScopeName}</span></span>
        </div>
      </div>
    </div>
  </div></OverlayLayerProvider>;
});
