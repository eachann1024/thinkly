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
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/GooseTableHandle.tsx#messages:1">`
zh-Hans:
  rowActions: "行操作"
  columnActions: "列操作"
  insertRowAbove: "在上方插入行"
  insertColumnLeft: "在左侧插入列"
  insertRowBelow: "在下方插入行"
  insertColumnRight: "在右侧插入列"
  copy: "复制"
  rowsAndColumnsWithMergedCellsCannotBe: "含合并单元格，暂不支持复制行列"
  clearContents: "清空内容"
  tableOptions: "表格选项"
  headerRow: "标题行"
  headerColumn: "标题列"
  enabled: "已启用"
  disabled: "未启用"
  distributeColumnsEvenly: "列宽均分"
  fitToPageWidth: "适应页面宽度"
  deleteRow: "删除行"
  deleteColumn: "删除列"
  duplicateRow: "复制行"
  duplicateColumn: "复制列"
en:
  rowActions: "Row actions"
  columnActions: "Column actions"
  insertRowAbove: "Insert row above"
  insertColumnLeft: "Insert column left"
  insertRowBelow: "Insert row below"
  insertColumnRight: "Insert column right"
  copy: "Copy"
  rowsAndColumnsWithMergedCellsCannotBe: "Rows and columns with merged cells cannot be duplicated yet"
  clearContents: "Clear contents"
  tableOptions: "Table options"
  headerRow: "Header row"
  headerColumn: "Header column"
  enabled: "Enabled"
  disabled: "Disabled"
  distributeColumnsEvenly: "Distribute columns evenly"
  fitToPageWidth: "Fit to page width"
  deleteRow: "Delete row"
  deleteColumn: "Delete column"
  duplicateRow: "Duplicate row"
  duplicateColumn: "Duplicate column"
`;
const t = createTranslator(messages);

export { GooseTableExtendButton } from "./GooseTableExtendButton";

type TableHandleProps = {
  orientation: "row" | "column";
  hideOtherElements: (hide: boolean) => void;
};

export function GooseTableHandle({
  orientation,
  hideOtherElements,
}: TableHandleProps) {
  useLocale();
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
          aria-label={isRow ? t("rowActions") : t("columnActions")}
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
          {isRow ? t("insertRowAbove") : t("insertColumnLeft")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runMenuAction(() => insertDimension(false))}
        >
          {isRow ? <GooseIcons.ArrowDown /> : <GooseIcons.ArrowRight />}{" "}
          {isRow ? t("insertRowBelow") : t("insertColumnRight")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={hasMergedTableCells(state.block.content)}
          aria-describedby={
            hasMergedTableCells(state.block.content) ? mergeNoteId : undefined
          }
          onSelect={() => runMenuAction(duplicateDimension)}
        >
          <GooseIcons.Copy /> {isRow ? t("duplicateRow") : t("duplicateColumn")}
        </DropdownMenuItem>
        {hasMergedTableCells(state.block.content) && (
          <DropdownMenuItem
            disabled
            id={mergeNoteId}
            className="goose-table-menu-note"
          >
            {t("rowsAndColumnsWithMergedCellsCannotBe")}
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
          <GooseIcons.Eraser /> {t("clearContents")}
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
              <DropdownMenuItem textValue={t("tableOptions")}>
                <GooseIcons.Table2 /> {t("tableOptions")}{" "}
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
                    textValue={`${key === "headerRows" ? t("headerRow") : t("headerColumn")}，${state.block.content[key] ? t("enabled") : t("disabled")}`}
                    onSelect={() => runMenuAction(() => toggleHeader(key))}
                  >
                    {key === "headerRows" ? (
                      <GooseIcons.PanelTop />
                    ) : (
                      <GooseIcons.PanelLeft />
                    )}
                    {key === "headerRows" ? t("headerRow") : t("headerColumn")}
                    <span className="sr-only">
                      {state.block.content[key] ? t("enabled") : t("disabled")}
                    </span>
                    {Boolean(state.block.content[key]) && (
                      <GooseIcons.Check className="ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={() => runMenuAction(handleEvenColumnWidth)}
                >
                  <GooseIcons.AlignJustify /> {t("distributeColumnsEvenly")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runMenuAction(handleFitPageWidth)}>
                  <GooseIcons.Maximize2 /> {t("fitToPageWidth")}
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
              ? t("deleteRow")
              : t("deleteColumn")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
