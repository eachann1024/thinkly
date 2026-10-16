import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { ChevronDown, FolderOpen, Type } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSearchSession, type SearchSort } from "../sidebar/useSearchSession";

const SORT_LABELS: Record<SearchSort, string> = { best: "最佳匹配", recent: "最近编辑" };

export function SearchSheetFilters({ count }: { count: string }) {
  const s = useSearchSession(useShallow(state => ({
    scope: state.scope, startingNotebookId: state.startingNotebookId, titleOnly: state.titleOnly, sort: state.sort,
    setScope: state.setScope, setTitleOnly: state.setTitleOnly, setSort: state.setSort,
  })));
  const notebooks = useNotebooks(state => state.notebooks);
  const scopedId = s.scope.kind === "all" ? null : s.scope.notebookId;
  const scopeValue = s.scope.kind === "notebook" ? `notebook:${scopedId}` : s.scope.kind;
  const currentName = notebooks[s.startingNotebookId ?? ""]?.name ?? "当前记事本";
  const scopeLabel = s.scope.kind === "all" ? "所有记事本" : s.scope.kind === "current" ? currentName : notebooks[scopedId ?? ""]?.name ?? "记事本已移除";
  return <div className="search-sheet-filters">
    <DropdownMenu><DropdownMenuTrigger asChild>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" aria-label={`搜索范围：${scopeLabel}`}><FolderOpen size={14} aria-hidden="true"/>{scopeLabel}<ChevronDown size={12} aria-hidden="true"/></Button>
    </DropdownMenuTrigger><DropdownMenuContent align="start" className="w-64">
      <DropdownMenuRadioGroup value={scopeValue} onValueChange={value => s.setScope(value === "all" ? { kind: "all" } : value === "current" ? { kind: "current", notebookId: s.startingNotebookId } : { kind: "notebook", notebookId: value.slice(9) })}>
        <DropdownMenuRadioItem value="current">当前记事本 · {currentName}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="all">所有记事本</DropdownMenuRadioItem>
        {Object.values(notebooks).map(n => <DropdownMenuRadioItem key={n.id} value={`notebook:${n.id}`}>{n.name}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent></DropdownMenu>
    <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" data-active={s.titleOnly} aria-pressed={s.titleOnly} onClick={() => s.setTitleOnly(!s.titleOnly)}><Type size={14} aria-hidden="true"/>仅搜索标题</Button>
    <DropdownMenu><DropdownMenuTrigger asChild>
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-chip" aria-label={`排序：${SORT_LABELS[s.sort]}`}>{SORT_LABELS[s.sort]}<ChevronDown size={12} aria-hidden="true"/></Button>
    </DropdownMenuTrigger><DropdownMenuContent align="start">
      <DropdownMenuRadioGroup value={s.sort} onValueChange={value => s.setSort(value as SearchSort)}>
        <DropdownMenuRadioItem value="best">最佳匹配</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="recent">最近编辑</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent></DropdownMenu>
    <span className="search-sheet-spacer"/>
    <span className="search-sheet-row-count" role="status">{count}</span>
  </div>;
}
