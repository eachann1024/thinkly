import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-context-menu/groups/appendSidebarDeleteGroups.tsx#localMessages:1">`
zh-Hans:
  restoreFolder_5b9e: "恢复文件夹"
  restoreFile_e6af: "恢复文件"
  restoreNote_53bb: "恢复笔记"
  deletePermanently_7327: "彻底删除"
  moveToTrash_8d3b: "移到废纸篓"
  moveToRecycleBin_1e96: "移入回收站"
en:
  restoreFolder_5b9e: "Restore folder"
  restoreFile_e6af: "Restore file"
  restoreNote_53bb: "Restore note"
  deletePermanently_7327: "Delete permanently"
  moveToTrash_8d3b: "Move to Trash"
  moveToRecycleBin_1e96: "Move to Recycle Bin"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import {
  deletePageWithUndo,
  permanentlyDeletePageWithCleanup,
} from "@/lib/page-delete-actions";
import { MenuShortcut } from "../shared";
import type { appendSidebarOpenMoveGroups } from "./appendSidebarOpenMoveGroups";

export function appendSidebarDeleteGroups(
  input: ReturnType<typeof appendSidebarOpenMoveGroups>,
) {
  const { page, isLocalFolder, isTrashed, handleRestore, sections } =
    input;

  sections.push(
    <ContextMenuGroup key="danger">
      {isTrashed ? (
        <>
          <ContextMenuItem onSelect={handleRestore}>
            <GooseIcons.RotateCcw className="h-4 w-4" />
            <span>
              {isLocalFolder
                ? page.isFolder
                  ? uiText("restoreFolder_5b9e")
                  : uiText("restoreFile_e6af")
                : uiText("restoreNote_53bb")}
            </span>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => void permanentlyDeletePageWithCleanup(page.id)}
            className="text-foreground dark:text-foreground focus:text-[var(--goose-color-danger-focus)] focus:bg-[var(--goose-color-danger-subtle-bg)]"
          >
            <GooseIcons.Trash2 className="h-4 w-4" />
            <span>{uiText("deletePermanently_7327")}</span>
          </ContextMenuItem>
        </>
      ) : (
        <ContextMenuItem
          onSelect={() => void deletePageWithUndo(page.id)}
          className="text-foreground dark:text-foreground focus:text-[var(--goose-color-danger-focus)] focus:bg-[var(--goose-color-danger-subtle-bg)]"
        >
          {isLocalFolder ? (
            <GooseIcons.FileX className="h-4 w-4" />
          ) : (
            <GooseIcons.Trash2 className="h-4 w-4" />
          )}
          <span className="min-w-0 truncate">
            {isLocalFolder ? uiText("moveToTrash_8d3b") : uiText("moveToRecycleBin_1e96")}
          </span>
          <MenuShortcut shortcut="Mod+Backspace" />
        </ContextMenuItem>
      )}
    </ContextMenuGroup>,
  );
  return { ...input };
}
