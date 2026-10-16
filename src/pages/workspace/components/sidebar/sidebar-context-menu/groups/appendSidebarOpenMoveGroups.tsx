import * as GooseIcons from "@/components/ui/icons";
import { formatShortcut } from "@/lib/utils";
import { useTabs } from "@/stores/useTabs";
import {
  LOCAL_FOLDER_FILE_SHORTCUTS,
  copyLocalFolderPagePath,
  openLocalFolderPageInExternalApp,
  openLocalFolderPageInTerminal,
  revealLocalFolderPageInFileManager,
} from "@/lib/local-folder-file-actions";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { SidebarMoveSubmenu } from "../SidebarMoveSubmenu";
import {
  MenuShortcut,
  getExternalAppLabel,
  getFileManagerLabel,
  getTerminalLabel,
} from "../shared";
import type { buildSidebarCreateGroups } from "./buildSidebarCreateGroups";

export function appendSidebarOpenMoveGroups(
  input: ReturnType<typeof buildSidebarCreateGroups>,
) {
  const {
    page,
    isTrashed,
    movableNotebooks,
    handleDuplicatePage,
    handleMoveToNotebook,
    localFolderFileManager,
    localFolderExternalEditor,
    localFolderTerminal,
    showOpenTab,
    showLocalOpen,
    showOpen,
    showOrganize,
    showMove,
    showCopy,
    sections,
  } = input;

  if (showOpen) {
    sections.push(
      <ContextMenuGroup key="open">
        <ContextMenuLabel>打开</ContextMenuLabel>
        {showOpenTab ? (
          <ContextMenuItem
            onSelect={() => {
              if (isTrashed) return;
              closeNotebookAiIfFullscreen();
              useTabs.getState().openPermanentTab(page.id);
            }}
            disabled={isTrashed}
          >
            <GooseIcons.PanelTopOpen className="h-4 w-4" />
            <span className="min-w-0 truncate">在新标签页打开</span>
            <span className="goose-menu-shortcut">
              {formatShortcut("Mod")}+点击
            </span>
          </ContextMenuItem>
        ) : null}
        {showLocalOpen ? (
          <ContextMenuItem
            onSelect={() => void openLocalFolderPageInExternalApp(page)}
          >
            <GooseIcons.SquareArrowOutUpRight className="h-4 w-4" />
            <span className="min-w-0 truncate">
              {getExternalAppLabel(localFolderExternalEditor)}
            </span>
            <MenuShortcut
              shortcut={LOCAL_FOLDER_FILE_SHORTCUTS.openInExternalApp}
            />
          </ContextMenuItem>
        ) : null}
        {showLocalOpen ? (
          <ContextMenuItem
            onSelect={() => void revealLocalFolderPageInFileManager(page)}
          >
            <GooseIcons.FolderOpen className="h-4 w-4" />
            <span className="min-w-0 truncate">
              {getFileManagerLabel(!!page.isFolder, localFolderFileManager)}
            </span>
            <MenuShortcut
              shortcut={LOCAL_FOLDER_FILE_SHORTCUTS.revealInFileManager}
            />
          </ContextMenuItem>
        ) : null}
        {showLocalOpen ? (
          <ContextMenuItem
            onSelect={() => void openLocalFolderPageInTerminal(page)}
          >
            <GooseIcons.Terminal className="h-4 w-4" />
            <span className="min-w-0 truncate">
              {getTerminalLabel(localFolderTerminal)}
            </span>
            <MenuShortcut
              shortcut={LOCAL_FOLDER_FILE_SHORTCUTS.openInTerminal}
            />
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>,
    );
  }

  if (showOrganize || showMove || showCopy) {
    sections.push(
      <ContextMenuGroup key="organize">
        <ContextMenuLabel>整理</ContextMenuLabel>
        {showOrganize ? (
          <ContextMenuItem onSelect={handleDuplicatePage}>
            <GooseIcons.Copy className="h-4 w-4" />
            <span>创建副本</span>
          </ContextMenuItem>
        ) : null}
        {showMove ? (
          <SidebarMoveSubmenu
            notebooks={movableNotebooks}
            onMove={handleMoveToNotebook}
          />
        ) : null}
        {showCopy ? (
          <ContextMenuItem onSelect={() => void copyLocalFolderPagePath(page)}>
            <GooseIcons.ClipboardCopy className="h-4 w-4" />
            <span className="min-w-0 truncate">
              {page.isFolder ? "复制文件夹路径" : "复制文件路径"}
            </span>
            <MenuShortcut shortcut={LOCAL_FOLDER_FILE_SHORTCUTS.copyFilePath} />
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>,
    );
  }
  return { ...input };
}
