import type { BlockNoteEditor } from "@blocknote/core";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  isFoldableHeadingBlock,
  readHeadingCollapsed,
} from "./toggleHeadingGutter";
import {
  HEADING_SIDE_MENU_EXTRA_GAP,
  SIDE_MENU_CONTENT_GAP,
  isPointerInSideMenuCorridor,
  isPointerInTableChromeReach,
  isPointerOverBlockContent,
  isPointerInRects,
} from "./sideMenuHover";
import { ownsBlockToolbar } from "./blockToolbarOwner";
import { isPointerInToolbarCorridor } from "./blockHandleGeometry";
import { useBlockHandleReference } from "./useBlockHandleReference";
import { findBlockHandleContent } from "./blockHandleDom";

const SIDEBAR_INTERACTION_SELECTOR = ".workspace-sidebar-pane, .rct-main-tree";
export function useEditorSideMenuTarget(
  editor: BlockNoteEditor<any, any, any>,
  isDragging: boolean,
  menuRef: RefObject<HTMLDivElement | null>,
  pressedHandle: RefObject<boolean>,
  lockedBlockId?: string,
) {
  const [hoveredBlockId, setHoveredBlockId] = useState<string>();
  const [sidebarInteracting, setSidebarInteracting] = useState(false);
  const [foldTick, setFoldTick] = useState(0);
  const dragBlockId = useRef(hoveredBlockId);
  if (!isDragging) dragBlockId.current = hoveredBlockId;
  const blockId = lockedBlockId ?? (isDragging ? dragBlockId.current : hoveredBlockId);
  const block = blockId ? editor.getBlock(blockId) : undefined;
  const { referencePos, firstLineCenter, tablePlacement, tableHold } = useBlockHandleReference(editor, blockId, foldTick);
  const corridor = useRef<{ rect: DOMRect | null; gap: number }>({ rect: null, gap: 0 });

  const firstBlockId = editor.document[0]?.id as string | undefined;
  const showHeadingToggle = isFoldableHeadingBlock(block, firstBlockId) &&
    !(block?.props as { isToggleable?: boolean } | undefined)?.isToggleable;
  const liveHeading = block ? (editor.getBlock(block.id) ?? block) : undefined;
  const headingExpanded = liveHeading
    ? !readHeadingCollapsed(liveHeading)
    : false;
  void foldTick;

  const sideMenuGap =
    block?.type === "table"
      ? (tablePlacement?.gap ?? SIDE_MENU_CONTENT_GAP)
      : SIDE_MENU_CONTENT_GAP + HEADING_SIDE_MENU_EXTRA_GAP;
  const corridorTop = tablePlacement && referencePos
    ? Math.min(referencePos.top, tablePlacement.corridorTop)
    : referencePos?.top;
  corridor.current = {
    rect: referencePos && corridorTop !== undefined
      ? new DOMRect(referencePos.left, corridorTop, referencePos.width, referencePos.bottom - corridorTop)
      : referencePos,
    gap: sideMenuGap + (tablePlacement?.menuReach ?? 0),
  };
  useEffect(() => {
    const updateSidebarInteracting = (
      target: EventTarget | null = document.activeElement,
    ) => {
      const element = target instanceof Element ? target : null;
      const activeElement = document.activeElement;
      const next =
        Boolean(element?.closest(SIDEBAR_INTERACTION_SELECTOR)) ||
        Boolean(
          activeElement instanceof Element &&
            activeElement.closest(SIDEBAR_INTERACTION_SELECTOR),
        );
      setSidebarInteracting(next);
    };

    let leaveTimer: number | undefined;
    const hover = (id: string | undefined) => {
      window.clearTimeout(leaveTimer);
      if (id) setHoveredBlockId(id);
      else leaveTimer = window.setTimeout(() => setHoveredBlockId(undefined), 120);
    };
    const handlePointerMove = (event: PointerEvent) => {
      updateSidebarInteracting(event.target);
      if (pressedHandle.current || lockedBlockId) return;
      const target = event.target instanceof Element ? event.target : null;
      const keep = () => window.clearTimeout(leaveTimer);
      if (menuRef.current?.contains(target)) return keep();
      const toolbar = target?.closest<HTMLElement>("[data-goose-image-toolbar], [data-goose-video-toolbar]");
      const menu = target?.closest<HTMLElement>("[data-goose-block-handle-menu]");
      if (ownsBlockToolbar(toolbar ?? null, editor.prosemirrorView.dom, blockId) || ownsBlockToolbar(menu ?? null, editor.prosemirrorView.dom, blockId)) return keep();
      if (
        isPointerInSideMenuCorridor(
          event.clientX,
          event.clientY,
          corridor.current.rect ?? undefined,
          corridor.current.gap,
          32,
        )
      )
        return keep();
      if (blockId) {
        const current = findBlockHandleContent(editor.prosemirrorView.dom, blockId);
        const portal = Array.from(document.querySelectorAll<HTMLElement>(`[data-goose-image-toolbar][data-goose-block-id="${CSS.escape(blockId)}"], [data-goose-video-toolbar][data-goose-block-id="${CSS.escape(blockId)}"]`))
          .find((candidate) => ownsBlockToolbar(candidate, editor.prosemirrorView.dom, blockId));
        if (current && portal && isPointerInToolbarCorridor(current.getBoundingClientRect(), portal.getBoundingClientRect(), event.clientX, event.clientY)) return keep();
      }
      const content = target?.closest<HTMLElement>(".bn-block-content");
      if (target?.closest(".goose-table-chrome-left, .goose-table-chrome-top, .bn-table-handle")) return keep();
      const hold = tableHold.current;
      if (
        hold &&
        isPointerInTableChromeReach(hold.rect, event.clientX, event.clientY, hold.scale)
      ) {
        return keep();
      }
      if (
        content &&
        editor.prosemirrorView.dom.contains(content) &&
        (content.dataset.contentType === "table"
          ? isPointerInRects([content.getBoundingClientRect()], event.clientX, event.clientY)
          : isPointerOverBlockContent(content, event.clientX, event.clientY))
      ) {
        hover(
          content.closest<HTMLElement>('[data-node-type="blockContainer"]')
            ?.dataset.id,
        );
      } else {
        hover(undefined);
      }
    };
    const handleFocusChange = (event: FocusEvent) => {
      updateSidebarInteracting(event.target);
    };
    const handleWindowBlur = () => {
      pressedHandle.current = false;
      window.clearTimeout(leaveTimer);
      setHoveredBlockId(undefined);
    };
    const handlePointerUp = () => {
      pressedHandle.current = false;
    };
    window.addEventListener("blur", handleWindowBlur);

    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("focusin", handleFocusChange, true);
    document.addEventListener("focusout", handleFocusChange, true);
    return () => {
      window.clearTimeout(leaveTimer);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("focusin", handleFocusChange, true);
      document.removeEventListener("focusout", handleFocusChange, true);
    };
  }, [editor, menuRef, pressedHandle, lockedBlockId, blockId]);

  useEffect(() => editor.onChange(() => setFoldTick((tick) => tick + 1)), [editor]);

  const shouldShow =
    Boolean(referencePos && block) &&
    editor.isEditable &&
    (!sidebarInteracting || isDragging) &&
    (Boolean(hoveredBlockId || lockedBlockId) || isDragging);

  return {
    block,
    referencePos,
    firstLineCenter,
    shouldShow,
    showHeadingToggle,
    headingExpanded,
    sideMenuGap,
    tableMenuTop: block?.type === "table" ? tablePlacement?.top : undefined,
    setFoldTick,
  };
}
