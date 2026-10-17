import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/notebook-switcher/renderNotebookMenu.tsx#localMessages:1">`
zh-Hans:
  switchNotebook: "切换{{kind}}"
  notebookList: "现有{{kind}}列表"
  actions_2b6b: "操作"
  openFolder: "打开文件夹"
en:
  switchNotebook: "Switch {{kind}}"
  notebookList: "Available {{kind}} list"
  actions_2b6b: "Actions"
  openFolder: "Open folder"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PopoverContent, PopoverAction } from "@/components/ui/popover";
import { activateWorkspace } from "@/lib/settings-navigation";
import { activateNotebook } from "@/lib/notebookNavigation";
import type { useNotebookSwitcherActions } from "./useNotebookSwitcherActions";
import { SortableNotebookItem } from "./shared";
import { NotebookMenuItemContent, notebookMenuRowClassName } from "./NotebookMenuItem";

export function renderNotebookMenu(
  context: ReturnType<typeof useNotebookSwitcherActions>,
) {
  const {
    activeNotebookId,
    deleteNotebook,
    setIsOpen,
    isDraggingRef,
    menuRef,
    sensors,
    isRail,
    isHeader,
    active,
    notebookKind,
    notebookList,
    canDeleteNotebook,
    handleOpenLocalFolder,
    handleEdit,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = context;
  return (
    <PopoverContent
      data-goose-menu-slot="root"
      variant="menu"
      aria-label={uiText("switchNotebook", { kind: notebookKind })}
      className={cn(
        "goose-notebook-menu-surface goose-list-layout w-[var(--goose-popover-trigger-width)] min-w-56 max-w-[calc(100vw-1rem)] p-1 backdrop-blur-0",
        isRail && "goose-notebook-menu-surface--rail w-56",
        isHeader && "goose-notebook-menu-surface--header",
      )}
      side={isRail ? "right" : isHeader ? "bottom" : "top"}
      align={isRail ? "end" : "start"}
      alignOffset={0}
      sideOffset={6}
      collisionPadding={8}
      ref={menuRef}
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
          event.stopPropagation();
          return;
        }
        if (event.key === "Escape" && !event.altKey && !event.ctrlKey &&
          !event.metaKey && !isDraggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey)
          return;
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        const rows = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            ".goose-notebook-row",
          ),
        );
        if (!rows.length) return;
        event.preventDefault();
        const current = rows.findIndex((row) =>
          row.contains(document.activeElement),
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? rows.length - 1
              : event.key === "ArrowDown"
                ? (current + 1) % rows.length
                : current < 0
                  ? rows.length - 1
                  : (current - 1 + rows.length) % rows.length;
        rows[next].focus();
      }}
      onCloseAutoFocus={(e) => {
        if (!active || isDraggingRef.current) e.preventDefault();
      }}
      onInteractOutside={(e) => {
        if (isDraggingRef.current) e.preventDefault();
      }}
      onPointerDownOutside={(e) => {
        if (isDraggingRef.current) e.preventDefault();
      }}
    >
      {notebookList.length > 0 && (
        <div
          role="group"
          aria-label={uiText("notebookList", { kind: notebookKind })}
          data-goose-menu-slot="group"
          className="goose-list-group min-w-0"
        >
      <div className={cn(
        "goose-notebook-menu-list overflow-y-auto",
        !isHeader && "max-h-[max(4rem,calc(var(--goose-popover-available-height,80vh)-15rem))]",
        isHeader && "max-h-[min(20rem,calc(var(--goose-popover-available-height,80vh)-4rem))]",
      )}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={notebookList.map((nb) => nb.id)}
            strategy={verticalListSortingStrategy}
          >
            {notebookList.map((notebook) => (
              <SortableNotebookItem
                key={notebook.id}
                notebook={notebook}
                isActive={activeNotebookId === notebook.id}
                canDeleteNotebook={canDeleteNotebook}
                onActivate={(id) => {
                  activateWorkspace();
                  void activateNotebook(id);
                  setIsOpen(false);
                }}
                onEdit={handleEdit}
                onDeleteLocal={deleteNotebook}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
        </div>
      )}

      <div
        role="group"
        aria-label={uiText("actions_2b6b")}
        data-goose-menu-slot="group"
        className="goose-list-group goose-notebook-menu-actions min-w-0"
      >
      <PopoverAction
        className={notebookMenuRowClassName}
        onClick={handleOpenLocalFolder}
      >
        <NotebookMenuItemContent icon={<GooseIcons.FolderOpen />} name={uiText("openFolder")} />
      </PopoverAction>
      </div>
    </PopoverContent>
  );
}
