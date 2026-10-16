import { EditorAction } from "@/components/editor/ui/button";
import { useId } from "react";
import * as GooseIcons from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/editor/ui/dropdown-menu";
import { EditorSubmenuTrigger } from "@/components/editor/ui/vendor-menu";
import { editTableDimension, hasMergedTableCells } from "./tableMenuActions";
import { useEditorSettings } from "@/components/editor/platform/hostContext";
import { getTableDeletionLabel } from "./tableDeletion";
import { GooseTableColorMenu } from "./GooseTableColorMenu";
import { useTableHandleDrag } from "./useTableHandleDrag";
import { useGooseTableHandle } from "./useGooseTableHandle";
export { GooseTableExtendButton } from "./GooseTableExtendButton";

type TableHandleProps = {
  orientation: "row" | "column";
  hideOtherElements: (hide: boolean) => void;
};

export function GooseTableHandle({
  orientation,
  hideOtherElements,
}: TableHandleProps) {
  const { features } = useEditorSettings();
  const mergeNoteId = useId();
  const { isDragging, ...dragProps } = useTableHandleDrag(orientation, hideOtherElements);
  const {
    editor,
    state,
    index,
    isRow,
    open,
    deletionSnapshot,
    insertDimension,
    duplicateDimension,
    handleDelete,
    toggleHeader,
    handleEvenColumnWidth,
    handleFitPageWidth,
    runMenuAction,
    handleOpenChange,
  } = useGooseTableHandle(orientation, hideOtherElements);

  if (!editor.isEditable) return null;
  if (!state || index === undefined) return null;

  return (
    <DropdownMenu open={open && !isDragging} onOpenChange={(next) => {
      if (!isDragging) handleOpenChange(next);
    }}>
      <DropdownMenuTrigger asChild>
        <EditorAction
          {...dragProps}
          data-dragging={isDragging || undefined}
          type="button"
          className="bn-table-handle goose-editor-position-safe-trigger goose-table-handle-btn"
          aria-label={isRow ? "行操作" : "列操作"}
        >
          {isRow ? (
            <GooseIcons.GripVertical className="h-4 w-4" />
          ) : (
            <GooseIcons.GripHorizontal className="h-4 w-4" />
          )}
        </EditorAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        variant="menu"
        className="goose-table-menu"
        side={isRow ? "right" : "bottom"}
        align="start"
      >
        <DropdownMenuItem
          onSelect={() => runMenuAction(() => insertDimension(true))}
        >
          {isRow ? <GooseIcons.ArrowUp /> : <GooseIcons.ArrowLeft />}{" "}
          {isRow ? "在上方插入行" : "在左侧插入列"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runMenuAction(() => insertDimension(false))}
        >
          {isRow ? <GooseIcons.ArrowDown /> : <GooseIcons.ArrowRight />}{" "}
          {isRow ? "在下方插入行" : "在右侧插入列"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={hasMergedTableCells(state.block.content)}
          aria-describedby={
            hasMergedTableCells(state.block.content) ? mergeNoteId : undefined
          }
          onSelect={() => runMenuAction(duplicateDimension)}
        >
          <GooseIcons.Copy /> 复制{isRow ? "行" : "列"}
        </DropdownMenuItem>
        {hasMergedTableCells(state.block.content) && (
          <DropdownMenuItem
            disabled
            id={mergeNoteId}
            className="goose-table-menu-note"
          >
            含合并单元格，暂不支持复制行列
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() =>
            runMenuAction(() =>
              editor.exec(
                editTableDimension(state.block.id, orientation, index, {
                  type: "clear",
                }),
              ),
            )
          }
        >
          <GooseIcons.Eraser /> 清空内容
        </DropdownMenuItem>
        <GooseTableColorMenu
          editor={editor}
          blockId={state.block.id}
          orientation={orientation}
          index={index}
          onAction={runMenuAction}
        />
        {features.tablePresentationControls && (
          <>
            <EditorSubmenuTrigger>
              <DropdownMenuItem textValue="表格选项">
                <GooseIcons.Table2 /> 表格选项{" "}
                <GooseIcons.ChevronRight className="ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuContent
                variant="menu"
                className="goose-table-menu"
                side="right"
                sideOffset={2}
              >
                {(["headerRows", "headerCols"] as const).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    textValue={`${key === "headerRows" ? "标题行" : "标题列"}，${state.block.content[key] ? "已启用" : "未启用"}`}
                    onSelect={() => runMenuAction(() => toggleHeader(key))}
                  >
                    {key === "headerRows" ? (
                      <GooseIcons.PanelTop />
                    ) : (
                      <GooseIcons.PanelLeft />
                    )}
                    {key === "headerRows" ? "标题行" : "标题列"}
                    <span className="sr-only">
                      {state.block.content[key] ? "已启用" : "未启用"}
                    </span>
                    {Boolean(state.block.content[key]) && (
                      <GooseIcons.Check className="ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={() => runMenuAction(handleEvenColumnWidth)}
                >
                  <GooseIcons.AlignJustify /> 列宽均分
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runMenuAction(handleFitPageWidth)}>
                  <GooseIcons.Maximize2 /> 适应页面宽度
                </DropdownMenuItem>
              </DropdownMenuContent>
            </EditorSubmenuTrigger>
          </>
        )}
        <DropdownMenuItem
          className="text-foreground dark:text-foreground focus:text-[var(--goose-color-danger-focus)] focus:bg-[var(--goose-color-danger-subtle-bg)]"
          onSelect={handleDelete}
        >
          <GooseIcons.Trash2 />{" "}
          {deletionSnapshot
            ? getTableDeletionLabel(deletionSnapshot.plan)
            : isRow
              ? "删除行"
              : "删除列"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
