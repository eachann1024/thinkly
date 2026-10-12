import { Fragment, memo } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icons";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { SearchResultPage } from "../command/useCommandSearch";

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
export const SidebarSearchResults = memo(function SidebarSearchResults({ results, query, selectedId, duplicates, notebookNames, openResult, removeRecent }: {
  results: SearchResultPage[]; query: string; selectedId: string | undefined;
  duplicates: Set<string>; notebookNames: Record<string, string>;
  openResult: (page: SearchResultPage, enter?: boolean) => void; removeRecent: (id: string) => void;
}) {
  const hasQuery = Boolean(query.trim());
  return <>{results.map(page => <div className="sidebar-search-result-wrap" key={page.id}>
        <Button contentStyle="preserve" variant="ghost" size="sm" id={`search-result-${page.id}`} type="button" role="option" aria-selected={page.id === selectedId} className="h-auto whitespace-normal border-0 px-0 py-0 goose-list-row sidebar-search-result rounded-lg" onClick={() => openResult(page, useWorkspaceViewport.getState().leftExpandOverride)}>
          <span className="sidebar-search-result-title"><Highlight text={getPageTitle(page)} query={query}/></span>
          <span className="sidebar-search-result-count">{hasQuery && (page.literalBodyMatchCount ? `${page.literalBodyMatchCount} 处` : page.matchKind === "title" ? "标题" : page.matchKind === "pinyin" ? "拼音" : "")}</span>
          {duplicates.has(getPageTitle(page)) && <span className="sidebar-search-book">{notebookNames[page.workspaceId]}</span>}
          {hasQuery && <span className="sidebar-search-snippet"><Highlight text={page.matchKind === "title" ? "标题匹配 · 正文无命中" : page.matchKind === "pinyin" ? "标题拼音匹配" : page.contentSnippet ?? ""} query={query}/></span>}
        </Button>
        {!hasQuery && <IconButton size="xs" className="p-0 sidebar-search-remove" aria-label={`从最近访问中移除 ${getPageTitle(page)}`} onClick={() => removeRecent(page.id)}><X size={14}/></IconButton>}
      </div>)}</>;
});
