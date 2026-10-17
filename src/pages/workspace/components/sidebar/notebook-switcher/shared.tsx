import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/notebook-switcher/shared.tsx#localMessages:1">`
zh-Hans:
  pathUnavailable_ddd1: "路径失效"
  removeLocalFolder_505d: "移除本地文件夹"
  editNotebook_ed4e: "编辑笔记本"
en:
  pathUnavailable_ddd1: "Path unavailable"
  removeLocalFolder_505d: "Remove local folder"
  editNotebook_ed4e: "Edit notebook"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Notebook } from "@/stores/useNotebooks";
import { renderNotebookIcon } from "../notebookUtils";
import { NotebookMenuItemContent, notebookMenuRowClassName } from "./NotebookMenuItem";

export interface SortableNotebookItemProps {
  notebook: Notebook;
  isActive: boolean;
  canDeleteNotebook: boolean;
  onActivate: (id: string) => void;
  onEdit: (id: string) => void;
  onDeleteLocal: (id: string) => void;
}

export function SortableNotebookItem({
  notebook,
  isActive,
  canDeleteNotebook,
  onActivate,
  onEdit,
  onDeleteLocal,
}: SortableNotebookItemProps) {
  useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notebook.id });
  const dragMoved = useRef(false);

  if (isDragging) dragMoved.current = true;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        notebookMenuRowClassName,
        notebook.localPathMissing && "text-disabled",
        isDragging && "cursor-grabbing z-10",
        !isDragging && "cursor-pointer",
      )}
      {...attributes}
      {...listeners}
      role="menuitem"
      aria-current={isActive ? "true" : undefined}
      data-selected={isActive || undefined}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(notebook.id);
        }
      }}
      onPointerDown={(event) => {
        dragMoved.current = false;
        if (event.button !== 0 || event.ctrlKey) return;
        listeners?.onPointerDown?.(event);
      }}
      onClick={() => {
        if (dragMoved.current) {
          dragMoved.current = false;
          return;
        }
        // 路径失效也允许点击：重新触发存在性检测，若云盘目录恢复（如 iCloud 已物化）
        // 可自动清除「路径失效」并重新加载页面；若确实已删除则保持失效状态。
        onActivate(notebook.id);
      }}
    >
      <NotebookMenuItemContent
        icon={renderNotebookIcon(notebook.icon || (notebook.source === "local-folder" ? "FolderOpen" : "BookOpen"))}
        name={notebook.name}
      >
        {notebook.localPathMissing && (
          <span className="shrink-0 whitespace-nowrap text-xs text-danger">{uiText("pathUnavailable_ddd1")}</span>
        )}
      </NotebookMenuItemContent>
      <div
        className="goose-notebook-row-actions items-center gap-1 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {notebook.source === "local-folder" && canDeleteNotebook && (
          <TooltipProvider delayDuration={600}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton size="xs"
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md overflow-hidden px-0 text-muted-foreground hover:bg-[var(--goose-color-danger-subtle-bg)] hover:text-[var(--goose-color-danger)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLocal(notebook.id);
                  }}
                  aria-label={uiText("removeLocalFolder_505d")}
                >
                  <GooseIcons.FolderX className="h-3.5 w-3.5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">{uiText("removeLocalFolder_505d")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider delayDuration={600}>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton size="xs"
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md overflow-hidden px-0 text-muted-foreground hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
                aria-label={uiText("editNotebook_ed4e")}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(notebook.id);
                }}
              >
                <GooseIcons.Settings className="h-3.5 w-3.5" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">{uiText("editNotebook_ed4e")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {isActive && <GooseIcons.Check className="h-4 w-4 shrink-0" />}
    </div>
  );
}
