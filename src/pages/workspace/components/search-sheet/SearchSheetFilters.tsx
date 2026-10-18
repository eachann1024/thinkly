import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheetFilters.tsx#localMessages:1">`
zh-Hans:
  currentNamed: "当前笔记本 · {{name}}"
  bestMatch: "最佳匹配"
  recentlyEdited: "最近编辑"
  currentNotebook: "当前笔记本"
  allNotebooks: "所有笔记本"
  notebookRemoved: "笔记本已移除"
  searchScope: "搜索范围：{{scope}}"
  searchTitlesOnly: "仅搜索标题"
  sortBy: "排序：{{sort}}"
en:
  currentNamed: "Current notebook · {{name}}"
  bestMatch: "Best match"
  recentlyEdited: "Recently edited"
  currentNotebook: "Current notebook"
  allNotebooks: "All notebooks"
  notebookRemoved: "Notebook removed"
  searchScope: "Search scope: {{scope}}"
  searchTitlesOnly: "Search titles only"
  sortBy: "Sort: {{sort}}"
ja:
  currentNamed: "現在のノートブック · {{name}}"
  bestMatch: "関連度順"
  recentlyEdited: "最近編集した順"
  currentNotebook: "現在のノートブック"
  allNotebooks: "すべてのノートブック"
  notebookRemoved: "ノートブックは削除されました"
  searchScope: "検索範囲：{{scope}}"
  searchTitlesOnly: "タイトルのみ検索"
  sortBy: "並べ替え：{{sort}}"
`;
const uiText = createTranslator(localMessages);
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { ChevronDown, FolderOpen, Type } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSearchSession, type SearchSort } from "../sidebar/useSearchSession";

const SORT_LABELS: Record<SearchSort, string> = { get best() { return uiText("bestMatch"); }, get recent() { return uiText("recentlyEdited"); } };

export function SearchSheetFilters({ count }: { count: string }) {
  useLocale();
  const s = useSearchSession(useShallow(state => ({
    scope: state.scope, startingNotebookId: state.view.phase !== "closed" ? state.view.context.startingNotebookId : null, titleOnly: state.titleOnly, sort: state.sort,
    setScope: state.setScope, setTitleOnly: state.setTitleOnly, setSort: state.setSort,
  })));
  const notebooks = useNotebooks(state => state.notebooks);
  const scopedId = s.scope.kind === "all" ? null : s.scope.notebookId;
  const scopeValue = s.scope.kind === "notebook" ? `notebook:${scopedId}` : s.scope.kind;
  const currentName = notebooks[s.startingNotebookId ?? ""]?.name ?? uiText("currentNotebook");
  const scopeLabel = s.scope.kind === "all" ? uiText("allNotebooks") : s.scope.kind === "current" ? currentName : notebooks[scopedId ?? ""]?.name ?? uiText("notebookRemoved");
  return <div className="search-sheet-filters">
    <DropdownMenu><DropdownMenuTrigger asChild>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" aria-label={uiText("searchScope", {scope: scopeLabel})}><FolderOpen size={14} aria-hidden="true"/>{scopeLabel}<ChevronDown size={12} aria-hidden="true"/></Button>
    </DropdownMenuTrigger><DropdownMenuContent align="start" className="w-64" motion="instant">
      <DropdownMenuRadioGroup value={scopeValue} onValueChange={value => s.setScope(value === "all" ? { kind: "all" } : value === "current" ? { kind: "current", notebookId: s.startingNotebookId } : { kind: "notebook", notebookId: value.slice(9) })}>
        <DropdownMenuRadioItem value="current">{uiText("currentNamed", {name: currentName})}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="all">{uiText("allNotebooks")}</DropdownMenuRadioItem>
        {Object.values(notebooks).map(n => <DropdownMenuRadioItem key={n.id} value={`notebook:${n.id}`}>{n.name}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent></DropdownMenu>
    <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" data-active={s.titleOnly} aria-pressed={s.titleOnly} onClick={() => s.setTitleOnly(!s.titleOnly)}><Type size={14} aria-hidden="true"/>{uiText("searchTitlesOnly")}</Button>
    <DropdownMenu><DropdownMenuTrigger asChild>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" aria-label={uiText("sortBy", {sort: SORT_LABELS[s.sort]})}>{SORT_LABELS[s.sort]}<ChevronDown size={12} aria-hidden="true"/></Button>
    </DropdownMenuTrigger><DropdownMenuContent align="start" motion="instant">
      <DropdownMenuRadioGroup value={s.sort} onValueChange={value => s.setSort(value as SearchSort)}>
        <DropdownMenuRadioItem value="best">{uiText("bestMatch")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="recent">{uiText("recentlyEdited")}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent></DropdownMenu>
    <span className="search-sheet-spacer"/>
    <span className="search-sheet-row-count" role="status">{count}</span>
  </div>;
}
