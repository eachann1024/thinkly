import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitPanePageMenu.tsx#localMessages:1">`
zh-Hans:
  switchSibling: "切换同级笔记"
  switchNotebookRoot: "切换笔记本中的笔记"
en:
  switchSibling: "Switch notes in this folder"
  switchNotebookRoot: "Switch notes in this notebook"
ja:
  switchSibling: "同じ階層のノートを切り替える"
  switchNotebookRoot: "ノートブック内のノートを切り替える"
`;
const uiText = createTranslator(localMessages);
import { cloneElement, useState, type ReactElement } from "react";
import { getPageTitle } from "@/components/editor/utils/page-title";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as GooseIcons from "@/components/ui/icons";
import { replaceSplitPanePage } from "@/lib/editor-split/replacePanePage";
import {
  splitSwitcherEntries,
  type SplitSwitcherEntry,
  type SplitSwitcherPage,
  type SplitSwitcherScope,
} from "@/lib/editor-split/switcherEntries";
import type { Page } from "@/types";
import { useLocalFolderOrders } from "@/stores/localFolderOrder";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";

function readEntries(page: Page, scope: SplitSwitcherScope): SplitSwitcherEntry[] {
  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  const orders = useLocalFolderOrders.getState().ordersByNotebook[page.workspaceId];
  const pages: SplitSwitcherPage[] = Object.values(usePages.getState().pages).map((item) => ({
    id: item.id,
    workspaceId: item.workspaceId,
    parentId: item.parentId,
    isFolder: item.isFolder,
    trashedAt: item.trashedAt,
    editorDraft: item.editorDraft,
    localUnsaved: item.localUnsaved,
    localPendingCreate: Boolean(item.localPendingCreate),
    order: item.order,
    createdAt: item.createdAt,
    title: getPageTitle(item),
  }));
  return splitSwitcherEntries(pages, page, scope, {
    localFolder: notebook?.source === "local-folder",
    manualOrders: orders,
  });
}

function SwitcherNodes({
  entries,
  currentId,
  onPick,
}: {
  entries: SplitSwitcherEntry[];
  currentId: string;
  onPick: (pageId: string) => void;
}) {
  return entries.map((entry) =>
    entry.isFolder ? (
      <DropdownMenuSub key={entry.id}>
        <DropdownMenuItem textValue={entry.title}>
          <GooseIcons.Folder className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{entry.title}</span>
          <GooseIcons.ChevronRight className="ml-auto h-4 w-4 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuContent side="right" align="start" sideOffset={2}>
          <SwitcherNodes entries={entry.children} currentId={currentId} onPick={onPick} />
        </DropdownMenuContent>
      </DropdownMenuSub>
    ) : (
      <DropdownMenuItem
        key={entry.id}
        textValue={entry.title}
        aria-current={entry.id === currentId ? "page" : undefined}
        onSelect={() => onPick(entry.id)}
      >
        <span className="min-w-0 flex-1 truncate">{entry.title}</span>
        {entry.id === currentId ? <GooseIcons.Check className="ml-auto h-4 w-4 shrink-0" /> : null}
      </DropdownMenuItem>
    ),
  );
}

export function SplitPanePageMenu({
  tabId,
  leafId,
  page,
  scope,
  children,
}: {
  tabId: string;
  leafId: string;
  page: Page;
  scope: SplitSwitcherScope;
  children: ReactElement<{ "aria-label"?: string }>;
}) {
  useLocale();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SplitSwitcherEntry[]>([]);
  const label = scope === "notebook-root" ? uiText("switchNotebookRoot") : uiText("switchSibling");
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (next) setEntries(readEntries(page, scope));
        setOpen(next);
      }}
    >
      <DropdownMenuTrigger asChild>
        {cloneElement(children, { "aria-label": label })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="editor-split-page-menu">
        <SwitcherNodes
          entries={entries}
          currentId={page.id}
          onPick={(pageId) => replaceSplitPanePage(tabId, leafId, pageId)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
