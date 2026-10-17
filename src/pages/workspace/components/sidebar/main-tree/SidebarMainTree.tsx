import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/SidebarMainTree.tsx#localMessages:1">`
zh-Hans:
  couldNotLoadLocalFolder_538d: "本地文件夹加载失败"
  reload_64ca: "重新加载"
  new_26bb: "新建"
  newFile_e48a: "新建文件"
  newFolder_f3a4: "新建文件夹"
  folderRefreshFailedShowingThePrevious_ed5e: "文件夹刷新失败，仍显示上次内容"
  retry_132c: "重试"
en:
  couldNotLoadLocalFolder_538d: "Could not load local folder"
  reload_64ca: "Reload"
  new_26bb: "New"
  newFile_e48a: "New file"
  newFolder_f3a4: "New folder"
  folderRefreshFailedShowingThePrevious_ed5e: "Folder refresh failed. Showing the previous contents."
  retry_132c: "Retry"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { memo } from "react";
import { renderMainTreeSurface } from "./controller/renderMainTreeSurface";
import * as GooseIcons from "@/components/ui/icons";
import { LocalFolderLoadingSkeleton } from "../LocalFolderLoadingSkeleton";
import { TreeEmptyState } from "../tree/TreeEmptyState";
import { getFixedAppShortcuts } from "@/lib/fixed-app-shortcuts";
import "./main-tree.css";
import {
  type SidebarMainTreeProps,
  scheduleAfterMenuClose,
  MenuShortcut,
} from "./controller/shared";
import { useMainTreeState } from "./controller/useMainTreeState";
import { useMainTreeLocalCreation } from "./controller/useMainTreeLocalCreation";
import { useMainTreeView } from "./controller/useMainTreeView";
import { useMainTreeDragActions } from "./controller/useMainTreeDragActions";

export const SidebarMainTree = memo(function SidebarMainTree(props: SidebarMainTreeProps) {
  useLocale();
  const tree = useMainTreeState(props);
  const creation = useMainTreeLocalCreation(tree);
  const view = useMainTreeView(creation);
  const mainTreeDragActionsContext = useMainTreeDragActions(view);
  const context = mainTreeDragActionsContext;
  const {
    activeNotebookId,
    viewportHeight,
    rootOrderMenuGroup,
    isLocalFolder,
    shouldShowLocalSkeleton,
    localLoadError,
    retryLocalFolderLoad,
    startCreateLocalFolder,
    startCreateLocalFile,
    hasPages,
  } = context;

  if (shouldShowLocalSkeleton) {
    return <LocalFolderLoadingSkeleton />;
  }

  if (localLoadError && !hasPages) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-4 text-center"
        role="alert"
      >
        <p className="text-sm font-medium text-foreground">
          {uiText("couldNotLoadLocalFolder_538d")}</p>
        <p className="mt-1 max-w-52 text-xs leading-relaxed text-muted-foreground">
          {localLoadError}
        </p>
        <Button contentStyle="preserve" variant="ghost" size="sm"
          type="button"
          onClick={retryLocalFolderLoad}
          className="h-auto whitespace-normal border-0 px-0 py-0 mt-3 rounded-[8px] bg-[var(--goose-interactive-selected)] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)] "
        >
          {uiText("reload_64ca")}</Button>
      </div>
    );
  }

  if (!activeNotebookId || !hasPages) {
    const emptyState = (
      <TreeEmptyState isLocalNotebook={isLocalFolder} height={viewportHeight} />
    );
    if (!isLocalFolder || !activeNotebookId) {
      return (
        <div className="flex min-h-0 w-full flex-1 flex-col">{emptyState}</div>
      );
    }
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex min-h-0 w-full flex-1 flex-col outline-none">
            {emptyState}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="goose-sidebar-context-menu w-48"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenuGroup>
            <ContextMenuLabel className="px-1.5 py-1">{uiText("new_26bb")}</ContextMenuLabel>
            <ContextMenuItem
              onSelect={() =>
                scheduleAfterMenuClose(() => startCreateLocalFile(undefined))
              }
            >
              <GooseIcons.FilePlus2 className="h-4 w-4" />
              <span className="min-w-0 truncate">{uiText("newFile_e48a")}</span>
              <MenuShortcut shortcut={getFixedAppShortcuts().newNote} />
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                scheduleAfterMenuClose(() => startCreateLocalFolder(undefined))
              }
            >
              <GooseIcons.FolderPlus className="h-4 w-4" />
              <span>{uiText("newFolder_f3a4")}</span>
            </ContextMenuItem>
          </ContextMenuGroup>
          {rootOrderMenuGroup}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <>
      {localLoadError && (
        <div
          className="mx-2 mb-1 flex items-center justify-between gap-2 rounded-[8px] bg-[var(--goose-color-danger-subtle-bg)] px-2.5 py-2 text-xs text-foreground"
          role="alert"
        >
          <span className="min-w-0 truncate" title={localLoadError}>
            {uiText("folderRefreshFailedShowingThePrevious_ed5e")}</span>
          <Button contentStyle="preserve" variant="ghost" size="sm"
            type="button"
            onClick={retryLocalFolderLoad}
            className="h-auto whitespace-normal border-0 px-0 py-0 shrink-0 font-medium underline underline-offset-2 "
          >
            {uiText("retry_132c")}</Button>
        </div>
      )}
      <ContextMenu>
        {renderMainTreeSurface(context)}
        {isLocalFolder && activeNotebookId && (
          <ContextMenuContent
            className="goose-sidebar-context-menu w-48"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <ContextMenuGroup>
              <ContextMenuLabel className="px-1.5 py-1">{uiText("new_26bb")}</ContextMenuLabel>
              <ContextMenuItem
                onSelect={() =>
                  scheduleAfterMenuClose(() => startCreateLocalFile(undefined))
                }
              >
                <GooseIcons.FilePlus2 className="h-4 w-4" />
                <span className="min-w-0 truncate">{uiText("newFile_e48a")}</span>
                <MenuShortcut shortcut={getFixedAppShortcuts().newNote} />
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() =>
                  scheduleAfterMenuClose(() =>
                    startCreateLocalFolder(undefined),
                  )
                }
              >
                <GooseIcons.FolderPlus className="h-4 w-4" />
                <span>{uiText("newFolder_f3a4")}</span>
              </ContextMenuItem>
            </ContextMenuGroup>
            {rootOrderMenuGroup}
          </ContextMenuContent>
        )}
      </ContextMenu>
    </>
  );
});
