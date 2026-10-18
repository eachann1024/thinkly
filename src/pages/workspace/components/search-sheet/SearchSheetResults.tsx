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
import { Fragment, memo } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Clock3, FileText, Sparkles, X } from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { SearchResultPage } from "../command/useCommandSearch";
import type { Page } from "@/types";
import { presenceName } from "@/lib/ui/presence";

export const AI_ROW_ID = "search-sheet-ai";

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const haystack = text.toLowerCase();
  const parts = []; let cursor = 0, index = haystack.indexOf(needle);
  while (index >= 0) {
    parts.push(<Fragment key={index}>{text.slice(cursor, index)}<mark>{text.slice(index, index + needle.length)}</mark></Fragment>);
    cursor = index + needle.length; index = haystack.indexOf(needle, cursor);
  }
  return <>{parts}{text.slice(cursor)}</>;
}

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

export const SearchSheetResults = memo(function SearchSheetResults({ results, query, selectedId, notebookNames, pages, openResult, removeRecent }: {
  results: SearchResultPage[]; query: string; selectedId: string | undefined;
  notebookNames: Record<string, string>; pages: Record<string, Page>;
  openResult: (page: SearchResultPage) => void; removeRecent: (id: string) => void;
}) {
  useLocale();
  const hasQuery = Boolean(query.trim());
  return <>{results.map(page => {
    const title = getPageTitle(page);
    const parent = page.parentId ? pages[page.parentId] : undefined;
    const path = [notebookNames[page.workspaceId], parent ? getPageTitle(parent) : ""].filter(Boolean).join(" / ");
    const snippet = page.matchKind === "title" || page.matchKind === "pinyin" ? "" : page.contentSnippet ?? "";
    return <div className="search-sheet-row-wrap" key={page.id} style={{ viewTransitionName: presenceName("search", page.id) }}>
      <Button contentStyle="preserve" variant="ghost" size="sm" id={`search-result-${page.id}`} type="button" role="option" aria-selected={page.id === selectedId} className="search-sheet-row" onClick={() => openResult(page)}>
        <span className="search-sheet-row-icon">{hasQuery ? <FileText size={16} aria-hidden="true"/> : <Clock3 size={16} aria-hidden="true"/>}</span>
        <span className="search-sheet-row-title"><Highlight text={title} query={query}/></span>
        <span className="search-sheet-row-count">{hasQuery ? matchLabel(page) : ""}</span>
        <span className="search-sheet-row-meta">{[path, formatDate(page.updatedAt)].filter(Boolean).join(" · ")}</span>
        {hasQuery && snippet && <span className="search-sheet-row-snippet"><Highlight text={snippet} query={query}/></span>}
      </Button>
      {!hasQuery && <IconButton size="xs" className="p-0 search-sheet-remove" aria-label={uiText("removeRecent", {title})} onClick={() => removeRecent(page.id)}><X size={14}/></IconButton>}
    </div>;
  })}</>;
});
