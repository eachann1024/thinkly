import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getNodeById } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import {
  GenericPopover,
  useBlockNoteEditor,
  useExtensionState,
} from "@blocknote/react";
import { offset, size, type Placement } from "@floating-ui/react";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { GooseTableExtendButton, GooseTableHandle } from "./GooseTableHandle";
import { tableRowUnderPointer } from "@/components/editor/extensions/tableCellSelectionDom";
import { isPointerInTableChromeReach } from "@/components/editor/core/sideMenuHover";
import { tableHandleRect, releaseTableChrome } from "./tableHandleGeometry";

/** 行/列把手要画出内容列。编辑器表面是 overflow:clip，挂在里面会被裁掉。 */
const TABLE_CHROME_PORTAL =
  typeof document === "undefined" ? null : document.body;

let pointer = { x: -1, y: -1 };
let pointerFrame = 0;
const pointerListeners = new Set<() => void>();

if (typeof document !== "undefined") {
  document.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (pointerFrame || pointerListeners.size === 0) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      pointerListeners.forEach((listener) => listener());
    });
  }, { passive: true });
}

/** 表格控件显示期间跟随指针。同一帧内多次移动只刷新一次。 */
function usePointerFollow(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const follow = () => setTick((value) => (value + 1) % 100000);
    pointerListeners.add(follow);
    return () => {
      pointerListeners.delete(follow);
    };
  }, [active]);
}

/** 指针在表内，或正停在已经弹出的行/列把手上。 */
function pointerOwnsTable(table: HTMLElement): boolean {
  if (pointer.x < 0) return false;
  const bounds = table.getBoundingClientRect();
  const scale = Number.parseFloat(getComputedStyle(table).getPropertyValue("--editor-scale")) || 1;
  if (isPointerInTableChromeReach(bounds, pointer.x, pointer.y, scale)) return true;
  const hit = document.elementFromPoint(pointer.x, pointer.y);
  return Boolean(hit?.closest(".goose-table-chrome-left, .goose-table-chrome-top, .bn-table-handle, .goose-table-menu"));
}

type Chrome =
  | "row"
  | "column"
  | "addOrRemoveRows"
  | "addOrRemoveColumns";

function TableChrome({
  element,
  getRect,
  placement,
  gap,
  stretch,
  children,
}: {
  element: Element;
  getRect?: () => DOMRect;
  placement: Placement;
  gap: number;
  stretch?: "width" | "height";
  children: ReactNode;
}) {
  const reference = useMemo(
    () => ({ element, ...(getRect ? { getBoundingClientRect: getRect } : {}) }),
    [element, getRect],
  );
  // GenericPopover already installs autoUpdate (scroll, resize, element resize and layout shift).
  const onMount = useCallback(
    (_reference: unknown, _floating: HTMLElement, update: () => void) => {
      window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
      return () =>
        window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    },
    [],
  );
  return (
    <GenericPopover
      reference={reference}
      useFloatingOptions={{
        open: true,
        placement,
        whileElementsMounted: onMount,
        middleware: [
          offset(gap),
          ...(placement === "left" || placement === "top" ? [size({
            apply({ rects, elements }) {
              const span = placement === "top" ? rects.reference.width : rects.reference.height;
              elements.floating.style.setProperty("--goose-table-chrome-span", `${span}px`);
              if (placement !== "left") return;
              // Floating UI rects are offset-parent relative; gutter space is viewport relative.
              const left = (getRect?.() ?? element.getBoundingClientRect()).left;
              elements.floating.style.setProperty(
                "--goose-table-handle-max-width",
                `${Math.max(4, left - gap)}px`,
              );
            },
          })] : []),
          ...(stretch
            ? [
                size({
                  apply({ rects, elements }) {
                    // Do not substitute availableWidth/Height: those describe viewport clipping, not the table.
                    elements.floating.style[stretch] =
                      `${rects.reference[stretch]}px`;
                  },
                }),
              ]
            : []),
        ],
      }}
      focusManagerProps={{ disabled: true }}
      useTransitionStylesProps={{ duration: 0 }}
      portalElement={TABLE_CHROME_PORTAL}
      elementProps={{ className: `goose-table-chrome-${placement}`, style: { zIndex: 10 } }}
    >
      {children}
    </GenericPopover>
  );
}

/** Project adapter around BlockNote's plugin, not a second table state/coordinate system. */
export function GooseTableHandlesController() {
  const editor = useBlockNoteEditor<any, any, any>();
  const state = useExtensionState(TableHandlesExtension);
  // BlockNote 在指针碰到表外标题时会把 show 关掉。把手还在边框外时继续跟指针，避免方块先消失。
  const sticky = useRef(false);
  usePointerFollow(Boolean(state?.show) || sticky.current);
  const [only, setOnly] = useState<Chrome>();
  const hide = useMemo(
    () =>
      Object.fromEntries(
        (
          [
            "row",
            "column",
            "addOrRemoveRows",
            "addOrRemoveColumns",
          ] as Chrome[]
        ).map((key) => [
          key,
          (hidden: boolean) =>
            setOnly((current) =>
              hidden ? key : releaseTableChrome(current, key),
            ),
        ]),
      ) as Record<Chrome, (hidden: boolean) => void>,
    [],
  );
  if (!state?.block || !editor.isEditable) {
    sticky.current = false;
    return null;
  }
  const node = getNodeById(state.block.id, editor.prosemirrorState.doc);
  if (!node) {
    sticky.current = false;
    return null;
  }
  const dom = editor.prosemirrorView.domAtPos(node.posBeforeNode + 3).node;
  const table = (dom instanceof Element ? dom : dom.parentElement)?.closest(
    "table",
  );
  if (!table) {
    sticky.current = false;
    return null;
  }
  // 移出表格后 BlockNote 仍保留上次的 show，碰到上方标题时又会把 show 关掉。
  // 指针还在表上、缝里或把手上就继续画。
  const owns = pointerOwnsTable(table);
  if (!state.draggingState && !owns) {
    sticky.current = false;
    return null;
  }
  if (!state.show && !owns) return null;
  sticky.current = true;
  const rowIndex = state.rowIndex;
  const colIndex = state.colIndex;
  const cell =
    rowIndex === undefined || colIndex === undefined
      ? undefined
      : table.rows[rowIndex]?.cells[colIndex];
  const visible = (key: Chrome) => !only || only === key;
  // 列把手仍跟指针下的格子。行把手跟整行：行间边框缝归到最近一行。
  const rowRect = () => {
    const tableRect = table.getBoundingClientRect();
    const dragging = state.draggingState?.draggedCellOrientation === "row";
    const row = dragging
      ? table.rows[rowIndex ?? -1]
      : tableRowUnderPointer(table, tableRect.left + 1, pointer.y);
    const rect = (row ?? cell)?.getBoundingClientRect();
    if (!rect) return new DOMRect();
    return DOMRect.fromRect(
      tableHandleRect(tableRect, rect, "row", dragging ? state.draggingState : undefined),
    );
  };
  const columnRect = () =>
    DOMRect.fromRect(
      tableHandleRect(
        table.getBoundingClientRect(),
        cell!.getBoundingClientRect(),
        "column",
        state.draggingState,
      ),
    );
  return (
    <>
      {cell && visible("row") && (
        <TableChrome
          element={table}
          getRect={rowRect}
          placement="left"
          gap={4}
        >
          <GooseTableHandle orientation="row" hideOtherElements={hide.row} />
        </TableChrome>
      )}
      {cell && visible("column") && (
        <TableChrome
          element={table}
          getRect={columnRect}
          placement="top"
          gap={4}
        >
          <GooseTableHandle
            orientation="column"
            hideOtherElements={hide.column}
          />
        </TableChrome>
      )}
      {visible("addOrRemoveRows") && (
        <TableChrome element={table} placement="bottom" gap={4} stretch="width">
          <GooseTableExtendButton
            orientation="addOrRemoveRows"
            hideOtherElements={hide.addOrRemoveRows}
          />
        </TableChrome>
      )}
      {visible("addOrRemoveColumns") && (
        <TableChrome element={table} placement="right" gap={4} stretch="height">
          <GooseTableExtendButton
            orientation="addOrRemoveColumns"
            hideOtherElements={hide.addOrRemoveColumns}
          />
        </TableChrome>
      )}
    </>
  );
}
