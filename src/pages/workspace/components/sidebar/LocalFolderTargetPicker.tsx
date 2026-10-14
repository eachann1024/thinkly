import { useEffect, useMemo, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "@/components/ui/sonner";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { activateNotebook } from "@/lib/notebookNavigation";
import {
  buildLocalFolderPickerItems,
  rememberLocalFolderTarget,
  readRecentLocalFolderTargets,
} from "@/lib/local-folder-target";
import { importTextFilesToLocalFolder } from "@/lib/local-folder-import";
import { useLocalFolderTargetPicker } from "@/stores/useLocalFolderTargetPicker";
import { usePages } from "@/stores/usePages";
import { useSidebarView } from "@/stores/useSidebarView";
import { useTabs } from "@/stores/useTabs";
import { useNotebooks } from "@/stores/useNotebooks";
import { getNotebookMoveTargets } from "@/lib/notebook-move-targets";
import { movePageToNotebook } from "@/lib/move-page-to-notebook";
import { renderNotebookIcon } from "./notebookUtils";

export function LocalFolderTargetPicker() {
  const { open, mode, workspaceId, pageId, importFiles, closePicker } =
    useLocalFolderTargetPicker();
  const pages = usePages((s) => s.pages);
  const notebooks = useNotebooks((s) => s.notebooks);
  const setExpandPageId = usePages((s) => s.setExpandPageId);
  const expandView = useSidebarView((s) => s.expand);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const recentKeys = useMemo(
    () =>
      workspaceId && open ? readRecentLocalFolderTargets(workspaceId) : [],
    [workspaceId, open],
  );

  const items = useMemo(
    () =>
      workspaceId && mode === "import"
        ? buildLocalFolderPickerItems(pages, workspaceId, {
            query,
            recentKeys,
          })
        : [],
    [pages, workspaceId, query, mode, recentKeys],
  );

  const moveTargets = getNotebookMoveTargets(
    pageId ? pages[pageId] : undefined,
    notebooks,
  ).filter((notebook) =>
    notebook.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  const handleMove = async (notebookId: string) => {
    if (pageId && (await movePageToNotebook(pageId, notebookId))) closePicker();
  };

  const handleSelect = async (folderId: string | undefined) => {
    if (!workspaceId) return;

    const { importedIds, failedCount } = await importTextFilesToLocalFolder({
      workspaceId,
      files: importFiles,
      parentId: folderId,
    });
    rememberLocalFolderTarget(workspaceId, folderId);
    closePicker();

    const firstPageId = importedIds[0];
    if (!firstPageId) {
      toast.error("导入失败", {
        description: "文件内容无法解析为笔记。",
      });
      return;
    }

    closeNotebookAiIfFullscreen();
    await activateNotebook(workspaceId);
    useTabs.getState().openTab(firstPageId);
    await usePages.getState().setActivePage(firstPageId);
    if (folderId) {
      expandView(workspaceId, folderId);
      setExpandPageId(folderId);
    }

    const successCount = importedIds.length;
    toast.success(
      successCount === 1 ? "文本文件已导入" : `已导入 ${successCount} 个文件`,
      {
        description:
          failedCount > 0 ? `${failedCount} 个文件导入失败，已跳过` : undefined,
      },
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && closePicker()}
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder={mode === "move" ? "搜索其他记事本…" : "搜索文件夹或路径…"}
      />
      <CommandList>
        <CommandEmpty>
          {mode === "move" ? "没有可移动的其他记事本" : "没有匹配的文件夹"}
        </CommandEmpty>
        {mode === "move" ? (
          <CommandGroup heading="移动到">
            {moveTargets.map((notebook) => (
              <CommandItem
                key={notebook.id}
                value={notebook.id}
                disabled={notebook.localPathMissing}
                onSelect={() => void handleMove(notebook.id)}
              >
                {renderNotebookIcon(
                  notebook.icon || "BookOpen",
                  "h-4 w-4 shrink-0",
                )}
                <span className="min-w-0 truncate">{notebook.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <CommandGroup heading="导入到">
            {items.map((item) => (
              <CommandItem
                key={item.key}
                value={`${item.label} ${item.pathLabel}`}
                onSelect={() => void handleSelect(item.folderId)}
              >
                <GooseIcons.Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{item.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {item.pathLabel}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
