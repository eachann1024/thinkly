import * as GooseIcons from "@/components/ui/icons";
import type { ReactNode } from "react";
import { getFixedAppShortcuts } from "@/lib/fixed-app-shortcuts";
import { toast } from "@/components/ui/sonner";
import { isElectronHost } from "@/lib/local-vault";
import { clearLocalFolderOrder } from "@/stores/localFolderOrder";
import { MenuShortcut, scheduleAfterMenuClose } from "../shared";
import { useSidebarContextMenu } from "../useSidebarContextMenu";

export function buildSidebarCreateGroups(
  context: ReturnType<typeof useSidebarContextMenu>,
) {
  const {
    page,
    onCreateLocalFile,
    onCreateLocalFolder,
    isLocalFolder,
    isTrashed,
    folderHasManualOrder,
    movableNotebooks,
    handleDuplicatePage,
    handleRestore,
    handleMoveToNotebook,
    localFolderFileManager,
    localFolderExternalEditor,
    localFolderTerminal,
    singleTabMode,
    setRenaming,
    createParentId,
  } = context;

  const showCreate =
    isLocalFolder &&
    !isTrashed &&
    !!page.localFilePath &&
    (!!onCreateLocalFile || !!onCreateLocalFolder);

  const showOpenTab =
    !singleTabMode && !(isElectronHost && isLocalFolder && page.isFolder);

  const showLocalOpen = isLocalFolder && !isTrashed && !!page.localFilePath;

  const showOpen = showOpenTab || showLocalOpen;

  const showOrganize = !isTrashed && !page.isFolder;

  const showMove =
    !isTrashed &&
    !page.localPendingCreate &&
    !page.localUnsaved &&
    (!isLocalFolder || !!page.localFilePath);

  const showRestoreOrder =
    isLocalFolder && !isTrashed && !!page.isFolder && folderHasManualOrder;

  const showCopy = showLocalOpen;

  const sections: ReactNode[] = [];

  if (!isTrashed && !page.localPendingCreate && !page.localUnsaved) {
    sections.push(
      <ContextMenuGroup key="rename">
        <ContextMenuItem
          onSelect={() => scheduleAfterMenuClose(() => setRenaming(true))}
        >
          <GooseIcons.Pencil className="h-4 w-4" />
          <span>重命名</span>
          <MenuShortcut shortcut="F2" />
        </ContextMenuItem>
      </ContextMenuGroup>,
    );
  }

  if (showCreate) {
    sections.push(
      <ContextMenuGroup key="create">
        <ContextMenuLabel>新建</ContextMenuLabel>
        {onCreateLocalFile ? (
          <ContextMenuItem
            onSelect={() =>
              scheduleAfterMenuClose(() => onCreateLocalFile(createParentId))
            }
          >
            <GooseIcons.FilePlus2 className="h-4 w-4" />
            <span className="min-w-0 truncate">新建笔记</span>
            <MenuShortcut shortcut={getFixedAppShortcuts().newNote} />
          </ContextMenuItem>
        ) : null}
        {onCreateLocalFolder ? (
          <ContextMenuItem
            onSelect={() =>
              scheduleAfterMenuClose(() => onCreateLocalFolder(createParentId))
            }
          >
            <GooseIcons.FolderPlus className="h-4 w-4" />
            <span>新建文件夹</span>
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>,
    );
  }

  if (showRestoreOrder) {
    sections.push(
      <ContextMenuGroup key="sort">
        <ContextMenuItem
          onSelect={() =>
            scheduleAfterMenuClose(() => {
              if (clearLocalFolderOrder(page.workspaceId, page.id)) {
                toast.success("已恢复名称排序");
              }
            })
          }
        >
          <GooseIcons.ArrowDownAZ className="h-4 w-4" />
          <span className="min-w-0 truncate">恢复名称排序</span>
        </ContextMenuItem>
      </ContextMenuGroup>,
    );
  }
  return {
    context,
    page,
    onCreateLocalFile,
    onCreateLocalFolder,
    isLocalFolder,
    isTrashed,
    folderHasManualOrder,
    movableNotebooks,
    handleDuplicatePage,
    handleRestore,
    handleMoveToNotebook,
    localFolderFileManager,
    localFolderExternalEditor,
    localFolderTerminal,
    singleTabMode,
    setRenaming,
    createParentId,
    showCreate,
    showOpenTab,
    showLocalOpen,
    showOpen,
    showOrganize,
    showMove,
    showRestoreOrder,
    showCopy,
    sections,
  };
}
