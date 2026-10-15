import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef } from "react";
import { renderNotebookMenu } from "./notebook-switcher/renderNotebookMenu";
import * as GooseIcons from "@/components/ui/icons";
import "./notebook-switcher.css";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { NotebookEditDialog } from "./NotebookEditDialog";
import { useNotebookSwitcherState } from "./notebook-switcher/useNotebookSwitcherState";
import { useNotebookSwitcherActions } from "./notebook-switcher/useNotebookSwitcherActions";
import { renderNotebookIcon } from "./notebookUtils";

export function NotebookSwitcher(
  props: {
    onOpenSettings?: () => void;
    variant?: "default" | "rail";
    triggerContainer?: HTMLElement | null;
  } = {},
) {
  const switcher = useNotebookSwitcherState(props);
  const notebookSwitcherActionsContext = useNotebookSwitcherActions(switcher);
  const context = notebookSwitcherActionsContext;
  const {
    notebookDropdownHoverExpand,
    isOpen,
    setIsOpen,
    isDraggingRef,
    menuRef,
    editDialog,
    setEditDialog,
    activeNotebook,
    isRail,
    notebookKind,
    activeNotebookLabel,
    handleSaveEdit,
    handleDelete,
  } = context;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocus = useRef(false);
  const defaultNotebookIcon = activeNotebook
    ? (activeNotebook.source === "local-folder" ? "FolderOpen" : "BookOpen")
    : "FolderOpen";

  // 移动入口时关闭旧锚点菜单，编辑/新建对话框仍由同一个组件持有。
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    isDraggingRef.current = false;
    setIsOpen(false);
    if (restoreTriggerFocus.current) trigger?.focus({ preventScroll: true });
    return () => {
      restoreTriggerFocus.current = document.activeElement === trigger;
    };
  }, [props.triggerContainer, setIsOpen, isDraggingRef]);

  const switcherPopover = (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!isDraggingRef.current) setIsOpen(open);
        }}
        variant="notebook"
        openOnHover={notebookDropdownHoverExpand}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button contentStyle="preserve" variant="ghost" size="sm"
                ref={triggerRef}
                type="button"
                aria-label={`当前${notebookKind} ${activeNotebookLabel}，点击切换`}
                title={
                  isRail
                    ? `${activeNotebookLabel} · 点击切换${notebookKind}`
                    : undefined
                }
                className={cn(
                  "h-auto border-0 py-0 sidebar-notebook-trigger group text-foreground outline-none",
                  isRail && "sidebar-notebook-trigger--rail",
                )}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
                    return;
                  event.preventDefault();
                  setIsOpen(true);
                  menuRef.current
                    ?.querySelector<HTMLElement>('[aria-current="true"]')
                    ?.focus();
                }}
              >
                <span aria-hidden="true" className="goose-notebook-monogram goose-notebook-icon">
                  {renderNotebookIcon(activeNotebook?.icon || defaultNotebookIcon)}
                </span>
                {isRail ? (
                  <span className="sidebar-rail-control-label">记事本</span>
                ) : (
                  <span className="min-w-0 truncate leading-5" title={activeNotebook?.name}>
                    {activeNotebookLabel}
                  </span>
                )}
                <GooseIcons.ChevronUp
                  className="goose-notebook-chevron"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side={isRail ? "right" : "top"}>
            {activeNotebookLabel} · 点击切换{notebookKind}
          </TooltipContent>
        </Tooltip>
        {renderNotebookMenu(context)}
      </Popover>
  );

  return (
    <>
      {props.triggerContainer
        ? createPortal(switcherPopover, props.triggerContainer)
        : switcherPopover}
      {editDialog.open && (
        <NotebookEditDialog
          open={editDialog.open}
          notebookId={editDialog.id}
          name={editDialog.name}
          icon={editDialog.icon}
          confirmName={editDialog.confirmName}
          excludeFromGlobalSearch={editDialog.excludeFromGlobalSearch}
          openDeleteConfirm={editDialog.openDeleteConfirm}
          isLocalFolder={editDialog.isLocalFolder}
          onOpenChange={(open) => setEditDialog({ ...editDialog, open })}
          onNameChange={(name) => setEditDialog({ ...editDialog, name })}
          onIconChange={(icon) => setEditDialog({ ...editDialog, icon })}
          onExcludeFromGlobalSearchChange={(excludeFromGlobalSearch) =>
            setEditDialog({ ...editDialog, excludeFromGlobalSearch })
          }
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      )}


    </>
  );
}
