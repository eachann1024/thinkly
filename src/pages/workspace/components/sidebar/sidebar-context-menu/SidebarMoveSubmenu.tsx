import * as GooseIcons from "@/components/ui/icons";
import type { Notebook } from "@/stores/useNotebooks";
import { renderNotebookIcon } from "../notebookUtils";
import { scheduleAfterMenuClose } from "./shared";

export function SidebarMoveSubmenu({
  notebooks,
  onMove,
}: {
  notebooks: Notebook[];
  onMove: (notebookId: string) => void;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger disabled={notebooks.length === 0}>
        <GooseIcons.FolderInput className="h-4 w-4" />
        <span className="min-w-0 truncate">移动到</span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent
        aria-label="移动到其他记事本"
        className="goose-sidebar-context-menu w-[var(--goose-menu-min-width)] max-h-[min(18rem,calc(100dvh-16px))]"
      >
        {notebooks.map((notebook) => (
          <ContextMenuItem
            key={notebook.id}
            disabled={notebook.localPathMissing}
            onSelect={() => scheduleAfterMenuClose(() => onMove(notebook.id))}
          >
            {renderNotebookIcon(
              notebook.icon || "BookOpen",
              "h-4 w-4 shrink-0",
            )}
            <span className="min-w-0 truncate">{notebook.name}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
