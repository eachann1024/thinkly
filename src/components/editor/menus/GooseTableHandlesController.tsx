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
import { useBlockToolbarState } from "@/components/editor/core/blockToolbarSequence";

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
  const [positionedElement, setPositionedElement] = useState<Element>();
  const latestElementRef = useRef(element);
  latestElementRef.current = element;
  const reference = useMemo(
    () => ({ element, ...(getRect ? { getBoundingClientRect: getRect } : {}) }),
    [element, getRect],
  );
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
                    elements.floating.style[stretch] =
                      `${rects.reference[stretch]}px`;
                  },
                }),
              ]
            : []),
          {
            name: "gooseTablePositioned",
            fn({ elements }) {
              const referenceElement = elements.reference instanceof Element
                ? elements.reference : elements.reference.contextElement;
              // This final middleware and Floating UI's coordinate commit finish
              // in the same microtask chain, before the browser can paint.
              if (referenceElement === latestElementRef.current) {
                setPositionedElement(referenceElement);
              }
              return {};
            },
          },
        ],
      }}
      focusManagerProps={{ disabled: true }}
      useTransitionStylesProps={{ duration: 0, initial: { opacity: 1 }, open: { opacity: 1 } }}
      portalElement={TABLE_CHROME_PORTAL}
      elementProps={{ className: `goose-table-chrome-${placement}`, style: {
        zIndex: 10,
        visibility: positionedElement === element ? "visible" : "hidden",
      } }}
    >
      {children}
    </GenericPopover>
  );
}

export function GooseTableHandlesController() {
  const editor = useBlockNoteEditor<any, any, any>();
  const state = useExtensionState(TableHandlesExtension);
  const toolbarState = useBlockToolbarState(editor, state?.block?.id);
  const sticky = useRef(false);
  const [only, setOnly] = useState<Chrome>();
  usePointerFollow(!only && (Boolean(state?.show) || sticky.current));
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
  const owns = pointerOwnsTable(table);
  if (toolbarState.suppressed || (!toolbarState.ready && !only && !state.draggingState)) {
    sticky.current = false;
    return null;
  }
  if (!only && !state.draggingState && !owns) {
    sticky.current = false;
    return null;
  }
  if (!only && !state.show && !owns) return null;
  sticky.current = true;
  const rowIndex = state.rowIndex;
  const colIndex = state.colIndex;
  const cell =
    rowIndex === undefined || colIndex === undefined
      ? undefined
      : table.rows[rowIndex]?.cells[colIndex];
  const visible = (key: Chrome) => !only || only === key;
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
