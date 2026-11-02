import { useLocale } from "@/i18n";
import { createTranslator, getFormatLocale, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheetResults.tsx#localMessages:1">`
zh-Hans:
  matchCount: "{{count}} 处"
  title: "标题"
  pinyin: "拼音"
  askAi: "询问 AI："
  removeRecent: "从最近访问中移除 {{title}}"
en:
  matchCount: "Matches: {{count}}"
  title: "Title"
  pinyin: "Pinyin"
  askAi: "Ask AI: "
  removeRecent: "Remove {{title}} from recently opened"
ja:
  matchCount: "{{count}} 件"
  title: "タイトル"
  pinyin: "ピンイン"
  askAi: "AI に質問："
  removeRecent: "{{title}}を最近開いた項目から削除"
`;
const uiText = createTranslator(localMessages);
import { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Clock3, FileText, Sparkles, X } from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { looseMatchRanges } from "../command/commandSearchText";
import type { SearchResultPage } from "../command/useCommandSearch";
import type { Page } from "@/types";
import { presenceName } from "@/lib/ui/presence";

export const AI_ROW_ID = "search-sheet-ai";

const Highlight = memo(function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = looseMatchRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  const parts = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    parts.push(<Fragment key={range.start}>{text.slice(cursor, range.start)}<mark>{text.slice(range.start, range.end)}</mark></Fragment>);
    cursor = range.end;
  }
  return <>{parts}{text.slice(cursor)}</>;
});

function formatDate(time: number) {
  const date = new Date(time), now = new Date();
  return date.toLocaleDateString(getFormatLocale(), {year: date.getFullYear() === now.getFullYear() ? undefined : "numeric", month: "short", day: "numeric"});
}

function matchLabel(page: SearchResultPage) {
  if (page.literalBodyMatchCount) return uiText("matchCount", {count: page.literalBodyMatchCount});
  return page.matchKind === "title" ? uiText("title") : page.matchKind === "pinyin" ? uiText("pinyin") : "";
}

export function AskAiRow({ query, selected, onAsk }: { query: string; selected: boolean; onAsk: () => void }) {
  useLocale();
  return <Button contentStyle="preserve" variant="ghost" size="sm" id={AI_ROW_ID} type="button" role="option" aria-selected={selected} data-kind="ai" className="search-sheet-row" onClick={onAsk}>
    <span className="search-sheet-row-icon"><Sparkles size={16} aria-hidden="true"/></span>
    <span className="search-sheet-row-title">{uiText("askAi")}{query}</span>
    <kbd className="search-sheet-kbd" aria-hidden="true">⇧↵</kbd>
  </Button>;
}

interface ResultActions {
  openResult: (page: SearchResultPage) => void;
  removeRecent: (id: string) => void;
}
interface ResultRowProps extends ResultActions {
  page: SearchResultPage; query: string; selected: boolean;
  notebookName: string; parentTitle: string;
}

const SearchSheetResultRow = memo(function SearchSheetResultRow({
  page, query, selected, notebookName, parentTitle, openResult, removeRecent,
}: ResultRowProps) {
  const locale = useLocale();
  const hasQuery = Boolean(query.trim());
  const display = useMemo(() => {
    const path = [notebookName, parentTitle].filter(Boolean).join(" / ");
    return {
      title: getPageTitle(page),
      meta: [path, formatDate(page.updatedAt)].filter(Boolean).join(" · "),
      label: hasQuery ? matchLabel(page) : "",
      snippet: page.matchKind === "title" || page.matchKind === "pinyin" ? "" : page.contentSnippet ?? "",
      style: { viewTransitionName: presenceName("search", page.id) },
    };
  }, [page, notebookName, parentTitle, hasQuery, locale]);
  const open = useCallback(() => openResult(page), [openResult, page]);
  const remove = useCallback(() => removeRecent(page.id), [removeRecent, page.id]);
  return <div className="search-sheet-row-wrap" style={display.style}>
    <Button contentStyle="preserve" variant="ghost" size="sm" id={`search-result-${page.id}`} type="button" role="option" aria-selected={selected} className="search-sheet-row" onClick={open}>
      <span className="search-sheet-row-icon">{hasQuery ? <FileText size={16} aria-hidden="true"/> : <Clock3 size={16} aria-hidden="true"/>}</span>
      <span className="search-sheet-row-title"><Highlight text={display.title} query={query}/></span>
      <span className="search-sheet-row-count">{display.label}</span>
      <span className="search-sheet-row-meta">{display.meta}</span>
      {hasQuery && display.snippet && <span className="search-sheet-row-snippet"><Highlight text={display.snippet} query={query}/></span>}
    </Button>
    {!hasQuery && <IconButton size="xs" className="p-0 search-sheet-remove" aria-label={uiText("removeRecent", {title: display.title})} onClick={remove}><X size={14}/></IconButton>}
  </div>;
});

export const SearchSheetResults = memo(function SearchSheetResults({ results, query, selectedId, notebookNames, pages, openResult, removeRecent }: {
  results: SearchResultPage[]; query: string; selectedId: string | undefined;
  notebookNames: Record<string, string>; pages: Record<string, Page>;
} & ResultActions) {
  useLocale();
  const latestActions = useRef({ openResult, removeRecent });
  useLayoutEffect(() => { latestActions.current = { openResult, removeRecent }; }, [openResult, removeRecent]);
  const open = useCallback((page: SearchResultPage) => latestActions.current.openResult(page), []);
  const remove = useCallback((id: string) => latestActions.current.removeRecent(id), []);
  const rows = useMemo(() => results.map(page => ({
    page, notebookName: notebookNames[page.workspaceId],
    parentTitle: page.parentId && pages[page.parentId] ? getPageTitle(pages[page.parentId]) : "",
  })), [results, notebookNames, pages]);
  return <>{rows.map(row => <SearchSheetResultRow key={row.page.id} {...row}
    query={query} selected={row.page.id === selectedId} openResult={open} removeRecent={remove}/>)}</>;
});
