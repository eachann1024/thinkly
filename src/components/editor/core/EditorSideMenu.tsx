import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor, useExtension, useExtensionState } from "@blocknote/react";
import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import { Plus, GripVertical } from "@/components/ui/icons";
import { EditorAction } from "../ui/button";
import { useLocale } from "@/i18n";
import { useEditorSideMenuTarget } from "./useEditorSideMenuTarget";
import { useBlockHandleDrag } from "./useBlockHandleDrag";
import { useBlockHandleHoverPhase } from "./useBlockHandleHoverPhase";
import { blockHandleCapabilities, BlockHandleIcon, isEmptyHandleParagraph } from "./blockHandleModel";
import { blockHandleText as t } from "./blockHandleMessages";
import { blockHandleLeft } from "./blockHandleGeometry";
import { getBlockToolbarOwner } from "./blockToolbarOwner";
import { openEmptyHandleMenu } from "./blockHandleActions";
import { BlockHandleMenu } from "./BlockHandleMenu";
import { setBlockHandleUi } from "../extensions/blockHandleUiExtension";
import { useEditorOverlayLayer } from "./useEditorOverlayLayer";
import { useSideMenuGlide } from "./useSideMenuGlide";
import { documentEdgeBlockIds } from "./documentEdgeBlockIds";
import { blockHandleSuggestionOwner } from "./blockHandleMenuOwnership";
import "./block-handle.css";

export function EditorSideMenu() {
  useLocale();
  const editor = useBlockNoteEditor<any, any, any>();
  const sideMenu = useExtension(SideMenuExtension);
  const slashShown = useExtensionState(SuggestionMenu, { selector: (state) => Boolean(state?.show) });
  const menuRef = useRef<HTMLDivElement>(null);
  const pressedHandle = useRef(false);
  const hoverOpenedBlock = useRef<string | undefined>(undefined);
  const suppressHoverUntilLeave = useRef(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [plusHot, setPlusHot] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [menuBlockId, setMenuBlockId] = useState<string>();
  const [closingBlockId, setClosingBlockId] = useState<string>();
  const [insertMenuId, setInsertMenuId] = useState<string>();
  const lockedBlockId = menuBlockId ?? closingBlockId ?? (slashShown ? insertMenuId : undefined);
  const finishMenuClose = useCallback((id: string) => {
    setClosingBlockId((current) => current === id ? undefined : current);
  }, []);
  const closeHiddenMenus = useCallback((hiddenId: string) => {
    window.clearTimeout(hoverTimer.current);
    setPlusHot(false);
    hoverOpenedBlock.current = undefined;
    suppressHoverUntilLeave.current = true;
    setMenuBlockId((current) => current === hiddenId ? undefined : current);
    finishMenuClose(hiddenId);
    if (insertMenuId === hiddenId) {
      const view = editor.prosemirrorView;
      const menu = !view.isDestroyed ? editor.getExtension(SuggestionMenu) : undefined;
      if (menu?.store.state?.triggerCharacter === "/" && blockHandleSuggestionOwner(view.dom) === hiddenId) menu.closeMenu();
      setInsertMenuId(undefined);
    }
  }, [editor, insertMenuId, finishMenuClose]);
  const { block, referencePos, firstLineCenter, shouldShow, sideMenuGap, tableMenuTop } =
    useEditorSideMenuTarget(editor, isDragging, menuRef, pressedHandle, lockedBlockId, closeHiddenMenus);
  const closeMenu = useCallback(() => setMenuBlockId(undefined), []);
  const { handleDragStart, handleDragEnd } = useBlockHandleDrag(editor, sideMenu, block, pressedHandle, closeMenu, isDragging, setIsDragging);
  useBlockHandleHoverPhase(editor, shouldShow ? block?.id : undefined, Boolean(lockedBlockId), isDragging);
  const empty = isEmptyHandleParagraph(block);
  const portalTarget = useEditorOverlayLayer();
  const gliding = useSideMenuGlide(shouldShow ? block?.id : undefined);
  const clearHover = useCallback(() => window.clearTimeout(hoverTimer.current), []);
  const openInsert = useCallback(() => {
    clearHover();
    if (block && openEmptyHandleMenu(editor, block.id)) setInsertMenuId(block.id);
  }, [editor, block?.id, clearHover]);
  useEffect(() => { setPlusHot(false); clearHover(); suppressHoverUntilLeave.current = false; }, [block?.id, clearHover]);
  useEffect(() => {
    if (plusHot && empty && shouldShow && block && insertMenuId !== block.id && !suppressHoverUntilLeave.current) {
      hoverTimer.current = window.setTimeout(openInsert, 180);
    }
    return clearHover;
  }, [plusHot, empty, shouldShow, block?.id, insertMenuId, openInsert, clearHover]);
  useEffect(() => {
    if (!slashShown) setInsertMenuId(undefined);
  }, [slashShown]);
  useEffect(() => {
    if (!menuBlockId) return;
    let leaveTimer: number | undefined;
    const clearLeave = () => window.clearTimeout(leaveTimer);
    const closeHoverMenu = () => {
      if (hoverOpenedBlock.current !== menuBlockId) return;
      hoverOpenedBlock.current = undefined;
      setClosingBlockId(menuBlockId);
      setMenuBlockId(undefined);
    };
    const move = (event: PointerEvent) => {
      clearLeave();
      if (hoverOpenedBlock.current !== menuBlockId) return;
      const handle = menuRef.current?.getBoundingClientRect();
      const menus = Array.from(document.querySelectorAll<HTMLElement>("[data-goose-block-handle-menu]"))
        .filter(menu => menu.dataset.gooseBlockId === menuBlockId &&
          menu.dataset.gooseEditorOwner === getBlockToolbarOwner(editor.prosemirrorView.dom));
      const rects = menus.map(menu => menu.getBoundingClientRect());
      if (handle) rects.push(handle);
      if (rects.some(rect => event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom)) return;
      const root = rects[0];
      if (handle && root && event.clientX >= Math.min(handle.left, root.left) &&
        event.clientX <= Math.max(handle.right, root.right) &&
        event.clientY >= Math.min(handle.top, root.top) &&
        event.clientY <= Math.max(handle.bottom, root.bottom)) return;
      leaveTimer = window.setTimeout(closeHoverMenu, 120);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerleave", closeHoverMenu);
    return () => {
      clearLeave();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerleave", closeHoverMenu);
    };
  }, [editor, menuBlockId]);
  useEffect(() => {
    const blur = () => {
      clearHover();
      setPlusHot(false);
      hoverOpenedBlock.current = undefined;
      suppressHoverUntilLeave.current = false;
      setMenuBlockId(undefined);
      setClosingBlockId(undefined);
      setInsertMenuId(undefined);
    };
    window.addEventListener("blur", blur);
    return () => { clearHover(); window.removeEventListener("blur", blur); };
  }, [clearHover]);
  useEffect(() => {
    if (!block || !empty || !shouldShow || !(plusHot || insertMenuId === block.id)) return;
    setBlockHandleUi(editor, { emptyBlockId: block.id });
    return () => { setBlockHandleUi(editor, { emptyBlockId: undefined }); };
  }, [editor, block?.id, empty, shouldShow, plusHot, insertMenuId]);

  const trailingEmpty = empty && block?.id === documentEdgeBlockIds(editor.prosemirrorState.doc).last;
  const top = tableMenuTop ?? firstLineCenter ?? (referencePos ? referencePos.top + Math.min(referencePos.height / 2, 14) : undefined);
  const bounds = shouldShow && referencePos && block ? portalTarget?.getBoundingClientRect() : undefined;
  const outsideViewport = Boolean(bounds && top !== undefined && (top < bounds.top || top > bounds.bottom));
  useLayoutEffect(() => {
    if (outsideViewport && lockedBlockId) closeHiddenMenus(lockedBlockId);
  }, [outsideViewport, lockedBlockId, closeHiddenMenus]);
  if (!shouldShow || !referencePos || !block || !portalTarget || !bounds || top === undefined || outsideViewport || (trailingEmpty && !lockedBlockId)) return null;
  const scale = Number.parseFloat(getComputedStyle(editor.prosemirrorView.dom).getPropertyValue("--editor-ui-scale")) || 1;
  const width = (empty ? 24 : 44) * scale;
  const left = blockHandleLeft(referencePos.left - sideMenuGap, width, bounds);
  return createPortal(
    <div ref={menuRef} className="bn-side-menu goose-block-handle fixed z-[70]"
      data-heading-gutter={block.type !== "table" ? "true" : undefined}
      data-react-aria-top-layer={menuBlockId ? true : undefined}
      data-gliding={gliding || undefined}
      data-dragging={isDragging || undefined}
      style={{ top: 0, left: 0, transform: `translate3d(${left - bounds.left}px, ${top - bounds.top}px, 0) translateY(-50%)`, pointerEvents: "auto" }}
      onMouseDown={(event) => { if (!(event.target as Element).closest("[draggable='true']")) event.preventDefault(); event.stopPropagation(); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <div className="goose-editor-inline-context-ui goose-block-handle-controls">
        {empty ? <EditorAction type="button" className="goose-block-handle-button goose-empty-block-add" aria-label={t("add")} aria-expanded={insertMenuId === block.id}
          onPointerEnter={() => { clearHover(); if (!suppressHoverUntilLeave.current) setPlusHot(true); }}
          onPointerLeave={() => { setPlusHot(false); clearHover(); suppressHoverUntilLeave.current = false; }} onClick={openInsert}><Plus aria-hidden="true" /></EditorAction>
          : <BlockHandleMenu editor={editor} block={block} open={menuBlockId === block.id} anchor={referencePos}
            onCloseComplete={finishMenuClose}
            onOpenChange={(open) => {
              clearHover();
              hoverOpenedBlock.current = undefined;
              setClosingBlockId(open ? undefined : block.id);
              setMenuBlockId(open ? block.id : undefined);
            }}>
            <EditorAction type="button" className="goose-block-handle-button" aria-label={t("menu")}
              onPointerEnter={() => {
                clearHover();
                if (menuBlockId === block.id || closingBlockId || suppressHoverUntilLeave.current) return;
                hoverTimer.current = window.setTimeout(() => {
                  hoverOpenedBlock.current = block.id;
                  setMenuBlockId(block.id);
                }, 200);
              }}
              onPointerLeave={() => { clearHover(); suppressHoverUntilLeave.current = false; }}
              onClick={(event) => {
                clearHover();
                if (menuBlockId === block.id && hoverOpenedBlock.current === block.id) {
                  // A click accepts the menu that hover just opened; it must not
                  // toggle it closed and restart its entry animation.
                  event.preventDefault();
                  hoverOpenedBlock.current = undefined;
                } else if (menuBlockId === block.id) {
                  suppressHoverUntilLeave.current = true;
                }
              }}
              draggable={blockHandleCapabilities(editor, block).draggable}
              onPointerDown={() => { clearHover(); pressedHandle.current = true; }} onPointerUp={() => { pressedHandle.current = false; }}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <BlockHandleIcon block={block} /><GripVertical aria-hidden="true" />
            </EditorAction>
          </BlockHandleMenu>}
      </div>
    </div>, portalTarget,
  );
}
