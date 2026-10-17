import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/NotebookSwitcher.tsx#localMessages:1">`
zh-Hans:
  currentNotebook: "当前{{kind}} {{name}}，点击切换"
  notebook_0021: "笔记本"
en:
  currentNotebook: "Current {{kind}}: {{name}}. Click to switch."
  notebook_0021: "Notebook"
`;
const uiText = createTranslator(localMessages);
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
import { NotebookName } from "./notebook-switcher/NotebookName";

export function NotebookSwitcher(
  props: {
    onOpenSettings?: () => void;
    variant?: "default" | "rail" | "header";
    triggerContainer?: HTMLElement | null;
    active?: boolean;
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
    isHeader,
    active,
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
  const NotebookChevron = isHeader ? GooseIcons.ChevronDown : GooseIcons.ChevronUp;

  // 隐藏或移动入口时关闭旧菜单；编辑对话框仍由同一个组件持有。
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    isDraggingRef.current = false;
    setIsOpen(false);
    if (active && restoreTriggerFocus.current) trigger?.focus({ preventScroll: true });
    return () => {
      restoreTriggerFocus.current = document.activeElement === trigger;
    };
  }, [props.triggerContainer, active, setIsOpen, isDraggingRef]);

  const switcherPopover = (
      <Popover
        open={active && isOpen}
        onOpenChange={(open) => {
          if (!isDraggingRef.current && (!open || active)) setIsOpen(open);
        }}
        variant="notebook"
        openOnHover={active && notebookDropdownHoverExpand}
      >
        <PopoverTrigger asChild>
            <Button contentStyle="preserve" variant="ghost" size="sm"
                ref={triggerRef}
                type="button"
                disabled={!active}
                aria-label={uiText("currentNotebook", { kind: notebookKind, name: activeNotebookLabel })}
                className={cn(
                  "h-auto border-0 py-0 sidebar-notebook-trigger group text-foreground outline-none",
                  isRail && "sidebar-notebook-trigger--rail",
                  isHeader && "sidebar-notebook-trigger--header",
                )}
                onKeyDownCapture={(event) => {
                  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
                    event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  if (event.defaultPrevented || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey)
                    return;
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
                  <span className="sidebar-rail-control-label">{uiText("notebook_0021")}</span>
                ) : (
                  <NotebookName name={activeNotebookLabel} />
                )}
                <NotebookChevron
                  className="goose-notebook-chevron"
                  aria-hidden="true"
                />
            </Button>
        </PopoverTrigger>
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
