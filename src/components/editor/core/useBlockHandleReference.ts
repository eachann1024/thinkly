import { useLayoutEffect, useRef, useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { SIDE_MENU_CONTENT_GAP, tableSideMenuWidth } from "./sideMenuHover";
import { blockHandleFirstLineCenter, ownBlockHandleContent } from "./blockHandleDom";

type TablePlacement = { top: number; gap: number; corridorTop: number; menuReach: number };
type TableHold = { rect: DOMRect; scale: number };
type Reference = { content: HTMLElement; position: DOMRect; firstLineCenter?: number; tablePlacement?: TablePlacement; tableHold: TableHold | null };

export function readLiveBlockHandleReference(editor: BlockNoteEditor<any, any, any>, blockId: string): Reference | null {
  const root = editor.prosemirrorView.dom;
  const element = root.querySelector<HTMLElement>(`[data-node-type="blockContainer"][data-id="${CSS.escape(blockId)}"]`);
  const content = ownBlockHandleContent(element);
  if (!element || !content?.isConnected || !root.contains(content)) return null;
  const rect = content.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const position = new DOMRect(rect.left, rect.top, rect.width, rect.height);
  const table = content.querySelector<HTMLTableElement>(":scope > .tableWrapper table");
  if (!table) return { content, position, firstLineCenter: blockHandleFirstLineCenter(content), tableHold: null };
  const scale = Number.parseFloat(getComputedStyle(content).getPropertyValue("--editor-scale")) || 1;
  const tableRect = table.getBoundingClientRect();
  const firstRow = table.rows[0]?.getBoundingClientRect();
  return {
    content, position, tableHold: { rect: tableRect, scale },
    tablePlacement: {
      top: firstRow ? firstRow.top + firstRow.height / 2 : tableRect.top,
      gap: SIDE_MENU_CONTENT_GAP + 28 * scale,
      corridorTop: tableRect.top - 24 * scale - 6,
      menuReach: tableSideMenuWidth(scale),
    },
  };
}

export function observeBlockHandleReference(editor: BlockNoteEditor<any, any, any>, blockId: string, onMeasure: (reference: Reference | null) => void): () => void {
  const root = editor.prosemirrorView.dom;
  let observedContent: HTMLElement | undefined;
  let previousMeasurement = "";
  const update = () => {
    // NodeViews can replace their content without changing the block ID.
    const reference = readLiveBlockHandleReference(editor, blockId);
    if (!reference) {
      if (previousMeasurement !== "hidden") {
        previousMeasurement = "hidden";
        if (observedContent) observer.unobserve(observedContent);
        observedContent = undefined;
        onMeasure(null);
      }
      return;
    }
    if (reference.content !== observedContent) {
      if (observedContent) observer.unobserve(observedContent);
      observedContent = reference.content;
      observer.observe(observedContent);
    }
    const { position, firstLineCenter, tableHold, tablePlacement } = reference;
    const measurement = [position.left, position.top, position.width, position.height, firstLineCenter,
      tableHold?.rect.left, tableHold?.rect.top, tableHold?.rect.width, tableHold?.rect.height, tableHold?.scale,
      tablePlacement?.top, tablePlacement?.gap, tablePlacement?.corridorTop, tablePlacement?.menuReach].join("|");
    if (measurement === previousMeasurement) return;
    previousMeasurement = measurement;
    onMeasure(reference);
  };
  const observer = new ResizeObserver(update);
  const mutations = new MutationObserver(update);
  const sheet = root.closest(".workspace-main-sheet");
  if (sheet) observer.observe(sheet);
  mutations.observe(root, { childList: true, subtree: true });
  update();
  window.addEventListener("resize", update);
  window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
  document.addEventListener("scroll", update, true);
  return () => {
    observer.disconnect();
    mutations.disconnect();
    window.removeEventListener("resize", update);
    window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    document.removeEventListener("scroll", update, true);
  };
}

export function useBlockHandleReference(editor: BlockNoteEditor<any, any, any>, blockId: string | undefined, documentTick: number, onHidden?: (blockId: string) => void) {
  const [referencePos, setReferencePos] = useState<DOMRect | null>(null);
  const [tablePlacement, setTablePlacement] = useState<TablePlacement>();
  const [firstLineCenter, setFirstLineCenter] = useState<number>();
  const tableHold = useRef<TableHold | null>(null);
  const measuredBlockId = useRef<string | undefined>(undefined);
  const hiddenCallback = useRef(onHidden);
  hiddenCallback.current = onHidden;
  useLayoutEffect(() => {
    if (measuredBlockId.current !== blockId) {
      measuredBlockId.current = blockId;
      tableHold.current = null;
      setReferencePos(null);
      setFirstLineCenter(undefined);
      setTablePlacement(undefined);
    }
    if (!blockId) return;
    return observeBlockHandleReference(editor, blockId, (reference) => {
      if (!reference) {
        setReferencePos(null);
        setFirstLineCenter(undefined);
        setTablePlacement(undefined);
        tableHold.current = null;
        hiddenCallback.current?.(blockId);
        return;
      }
      setReferencePos(reference.position);
      setFirstLineCenter(reference.firstLineCenter);
      setTablePlacement(reference.tablePlacement);
      tableHold.current = reference.tableHold;
    });
  }, [editor, blockId, documentTick]);
  return { referencePos, firstLineCenter, tablePlacement, tableHold };
}
