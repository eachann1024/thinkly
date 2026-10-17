import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-context-menu/groups/buildSidebarCreateGroups.tsx#localMessages:1">`
zh-Hans:
  rename_c8ce: "重命名"
  new_26bb: "新建"
  newNote_e82d: "新建笔记"
  newFolder_f3a4: "新建文件夹"
  nameSortingRestored_df43: "已恢复名称排序"
  sortByName_5b70: "恢复名称排序"
en:
  rename_c8ce: "Rename"
  new_26bb: "New"
  newNote_e82d: "New note"
  newFolder_f3a4: "New folder"
  nameSortingRestored_df43: "Name sorting restored"
  sortByName_5b70: "Sort by name"
ja:
  rename_c8ce: "名前を変更"
  new_26bb: "新規"
  newNote_e82d: "新規ノート"
  newFolder_f3a4: "新規フォルダ"
  nameSortingRestored_df43: "名前順に戻しました"
  sortByName_5b70: "名前順に戻す"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import type { ReactNode } from "react";
import { getFixedAppShortcuts } from "@/lib/fixed-app-shortcuts";
import { toast } from "@/components/ui/sonner";
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
    !singleTabMode && !(isLocalFolder && page.isFolder);

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
          <span>{uiText("rename_c8ce")}</span>
          <MenuShortcut shortcut="F2" />
        </ContextMenuItem>
      </ContextMenuGroup>,
    );
  }

  if (showCreate) {
    sections.push(
      <ContextMenuGroup key="create">
        <ContextMenuLabel>{uiText("new_26bb")}</ContextMenuLabel>
        {onCreateLocalFile ? (
          <ContextMenuItem
            onSelect={() =>
              scheduleAfterMenuClose(() => onCreateLocalFile(createParentId))
            }
          >
            <GooseIcons.FilePlus2 className="h-4 w-4" />
            <span className="min-w-0 truncate">{uiText("newNote_e82d")}</span>
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
            <span>{uiText("newFolder_f3a4")}</span>
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
                toast.success(uiText("nameSortingRestored_df43"));
              }
            })
          }
        >
          <GooseIcons.ArrowDownAZ className="h-4 w-4" />
          <span className="min-w-0 truncate">{uiText("sortByName_5b70")}</span>
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
