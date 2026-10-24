import { EditorAction } from "@/components/editor/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import {
  EMPTY_CELL_WIDTH,
  type PartialTableContent,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { cn } from "@/components/editor/utils/cn";
import { isTableExtendPointerClick } from "./tableExtendClick";
import { getTableColumnCount } from "./tableHandleSizing";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/GooseTableExtendButton.tsx#messages:1">`
zh-Hans:
  addColumn: "添加列"
  addRow: "添加行"
en:
  addColumn: "Add column"
  addRow: "Add row"
ja:
  addColumn: "列を追加"
  addRow: "行を追加"
`;
const t = createTranslator(messages);


type TableExtendButtonProps = {
  orientation: "addOrRemoveRows" | "addOrRemoveColumns";
  hideOtherElements: (hide: boolean) => void;
};

const roundTableExtendDelta = (value: number, margin = 0.3) => {
  const lowerBound = Math.floor(value) + margin;
  const upperBound = Math.ceil(value) - margin;

  if (value >= lowerBound && value <= upperBound) return Math.round(value);
  return value < lowerBound ? Math.floor(value) : Math.ceil(value);
};

export function GooseTableExtendButton({
  orientation,
  hideOtherElements,
}: TableExtendButtonProps) {
  useLocale();
  const editor = useBlockNoteEditor<any, any, any>();
  const tableHandles = useExtension(TableHandlesExtension);
  const block = useExtensionState(TableHandlesExtension, {
    selector: (state) => state?.block,
  });
  const movedMouse = useRef(false);
  const extending = useRef(false);
  const [editing, setEditing] = useState(false);
  const releaseDrag = useRef<(() => void) | undefined>(undefined);
  const isColumnHandle = orientation === "addOrRemoveColumns";

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!block || event.button !== 0) return;
      releaseDrag.current?.();
      extending.current = true;
      movedMouse.current = false;
      tableHandles.freezeHandles();
      hideOtherElements(true);
      setEditing(true);
      const original = structuredClone(block.content) as PartialTableContent<any, any>;
      const cropped = {
        ...original,
        rows: tableHandles.cropEmptyRowsOrColumns(block, isColumnHandle ? "columns" : "rows"),
      } as PartialTableContent<any, any>;
      const count = (content: PartialTableContent<any, any>) => isColumnHandle
        ? getTableColumnCount(content) : content.rows.length;
      const originalCount = count(original);
      const croppedCount = count(cropped);
      let currentCount = originalCount;
      const startPos = isColumnHandle ? event.clientX : event.clientY;
      const dom = editor.prosemirrorView.dom;
      const scale = Number.parseFloat(getComputedStyle(dom).getPropertyValue("--editor-scale")) || 1;
      const unit = (isColumnHandle ? EMPTY_CELL_WIDTH : 44) * scale;
      const win = event.currentTarget.ownerDocument.defaultView!;
      const abort = new AbortController();
      // Register immediately; React renders must not create gaps in drag listeners.
      const move = (mouse: MouseEvent) => {
        const diff = (isColumnHandle ? mouse.clientX : mouse.clientY) - startPos;
        if (!movedMouse.current && isTableExtendPointerClick(diff)) return;
        movedMouse.current = true;
        const nextCount = Math.max(1, croppedCount,
          originalCount + roundTableExtendDelta(diff / unit));
        if (nextCount === currentCount) return;
        currentCount = nextCount;
        editor.updateBlock(block, {
          type: "table",
          content: {
            ...original,
            columnWidths: isColumnHandle
              ? Array.from({ length: nextCount }, (_, i) => original.columnWidths?.[i])
              : original.columnWidths,
            rows: tableHandles.addRowsOrColumns(
              { type: "table", content: cropped } as any,
              isColumnHandle ? "columns" : "rows", nextCount - croppedCount,
            ),
          } as any,
        });
      };
      const finish = () => {
        abort.abort();
        releaseDrag.current = undefined;
        extending.current = false;
        tableHandles.unfreezeHandles();
        hideOtherElements(false);
        setEditing(false);
      };
      releaseDrag.current = finish;
      win.addEventListener("mousemove", (mouse) => {
        if (!(mouse.buttons & 1)) return finish();
        move(mouse);
      }, { signal: abort.signal });
      win.addEventListener("mouseup", (mouse) => {
        move(mouse);
        finish();
      }, { signal: abort.signal });
      win.addEventListener("blur", finish, { signal: abort.signal });
      event.preventDefault();
    },
    [block, editor, hideOtherElements, isColumnHandle, tableHandles],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!block || (event.detail !== 0 && movedMouse.current)) return;

      editor.updateBlock(block, {
        type: "table",
        content: {
          ...block.content,
          rows: isColumnHandle
            ? tableHandles.addRowsOrColumns(block, "columns", 1)
            : tableHandles.addRowsOrColumns(block, "rows", 1),
        } as any,
      });
    },
    [block, editor, isColumnHandle, tableHandles],
  );

  useEffect(() => () => releaseDrag.current?.(), []);

  if (!editor.isEditable) return null;

  return (
    <EditorAction
      type="button"
      className={cn(
        "goose-editor-inline-context-ui goose-table-extend-button",
        isColumnHandle
          ? "goose-table-extend-button-columns"
          : "goose-table-extend-button-rows",
        editing && "is-editing",
      )}
      aria-label={isColumnHandle ? t("addColumn") : t("addRow")}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <GooseIcons.Plus className="h-3.5 w-3.5" />
    </EditorAction>
  );
}
