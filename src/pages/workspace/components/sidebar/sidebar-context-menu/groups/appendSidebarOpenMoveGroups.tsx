import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-context-menu/groups/appendSidebarOpenMoveGroups.tsx#localMessages:1">`
zh-Hans:
  open_d709: "打开"
  openInNewTab_7e9c: "在新标签页打开"
  openSplitRight_6a21: "在右侧打开分屏"
  openSplitDown_8d44: "在下方打开分屏"
  click_b1f2: "+点击"
  organize_1b6c: "整理"
  duplicate_afb9: "创建副本"
  copyFolderPath_95ae: "复制文件夹路径"
  copyFilePath_87f5: "复制文件路径"
en:
  open_d709: "Open"
  openInNewTab_7e9c: "Open in new tab"
  openSplitRight_6a21: "Open in split to the right"
  openSplitDown_8d44: "Open in split below"
  click_b1f2: "+click"
  organize_1b6c: "Organize"
  duplicate_afb9: "Duplicate"
  copyFolderPath_95ae: "Copy folder path"
  copyFilePath_87f5: "Copy file path"
ja:
  open_d709: "開く"
  openInNewTab_7e9c: "新規タブで開く"
  openSplitRight_6a21: "右に分割して開く"
  openSplitDown_8d44: "下に分割して開く"
  click_b1f2: "+クリック"
  organize_1b6c: "整理"
  duplicate_afb9: "複製を作成"
  copyFolderPath_95ae: "フォルダパスをコピー"
  copyFilePath_87f5: "ファイルパスをコピー"
`;
const uiText = createTranslator(localMessages);
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
import { openPageBeside } from "@/lib/editor-split/openPageBeside";
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

  const showSplit = !page.isFolder;
  if (showOpen || showSplit) {
    sections.push(
      <ContextMenuGroup key="open">
        <ContextMenuLabel>{uiText("open_d709")}</ContextMenuLabel>
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
            <span className="min-w-0 truncate">{uiText("openInNewTab_7e9c")}</span>
            <span className="goose-menu-shortcut">
              {formatShortcut("Mod")}{uiText("click_b1f2")}</span>
          </ContextMenuItem>
        ) : null}
        {!page.isFolder ? (
          <ContextMenuItem
            onSelect={() => openPageBeside(page.id, "right")}
            disabled={isTrashed}
          >
            <GooseIcons.Columns2 className="h-4 w-4" />
            <span className="min-w-0 truncate">{uiText("openSplitRight_6a21")}</span>
          </ContextMenuItem>
        ) : null}
        {!page.isFolder ? (
          <ContextMenuItem
            onSelect={() => openPageBeside(page.id, "bottom")}
            disabled={isTrashed}
          >
            <GooseIcons.Rows2 className="h-4 w-4" />
            <span className="min-w-0 truncate">{uiText("openSplitDown_8d44")}</span>
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
        <ContextMenuLabel>{uiText("organize_1b6c")}</ContextMenuLabel>
        {showOrganize ? (
          <ContextMenuItem onSelect={handleDuplicatePage}>
            <GooseIcons.Copy className="h-4 w-4" />
            <span>{uiText("duplicate_afb9")}</span>
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
              {page.isFolder ? uiText("copyFolderPath_95ae") : uiText("copyFilePath_87f5")}
            </span>
            <MenuShortcut shortcut={LOCAL_FOLDER_FILE_SHORTCUTS.copyFilePath} />
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>,
    );
  }
  return { ...input };
}
