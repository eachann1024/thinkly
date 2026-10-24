import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor, useExtension, useExtensionState } from "@blocknote/react";
import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import { Plus, GripVertical, ChevronRight } from "@/components/ui/icons";
import { EditorAction } from "../ui/button";
import { useLocale } from "@/i18n";
import { toggleHeadingCollapsed } from "./toggleHeadingGutter";
import { useEditorSideMenuTarget } from "./useEditorSideMenuTarget";
import { useBlockHandleDrag } from "./useBlockHandleDrag";
import { useBlockHandleHoverPhase } from "./useBlockHandleHoverPhase";
import { blockHandleCapabilities, BlockHandleIcon, isEmptyHandleParagraph } from "./blockHandleModel";
import { blockHandleText as t } from "./blockHandleMessages";
import { blockHandleLeft } from "./blockHandleGeometry";
import { openEmptyHandleMenu } from "./blockHandleActions";
import { BlockHandleMenu } from "./BlockHandleMenu";
import { setBlockHandleUi } from "../extensions/blockHandleUiExtension";
import "./block-handle.css";

export function EditorSideMenu() {
  useLocale();
  const editor = useBlockNoteEditor<any, any, any>();
  const sideMenu = useExtension(SideMenuExtension);
  const slashShown = useExtensionState(SuggestionMenu, { selector: (state) => Boolean(state?.show) });
  const menuRef = useRef<HTMLDivElement>(null);
  const pressedHandle = useRef(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [plusHot, setPlusHot] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [menuBlockId, setMenuBlockId] = useState<string>();
  const [insertMenuId, setInsertMenuId] = useState<string>();
  const lockedBlockId = menuBlockId ?? (slashShown ? insertMenuId : undefined);
  const { block, referencePos, firstLineCenter, shouldShow, showHeadingToggle, headingExpanded, sideMenuGap, tableMenuTop, setFoldTick } =
    useEditorSideMenuTarget(editor, isDragging, menuRef, pressedHandle, lockedBlockId);
  const closeMenu = useCallback(() => setMenuBlockId(undefined), []);
  const { handleDragStart, handleDragEnd } = useBlockHandleDrag(editor, sideMenu, block, pressedHandle, closeMenu, isDragging, setIsDragging);
  useBlockHandleHoverPhase(editor, shouldShow ? block?.id : undefined, Boolean(lockedBlockId), isDragging);
  const empty = isEmptyHandleParagraph(block);
  const clearHover = useCallback(() => window.clearTimeout(hoverTimer.current), []);
  const openInsert = useCallback(() => {
    clearHover();
    if (block && openEmptyHandleMenu(editor, block.id)) setInsertMenuId(block.id);
  }, [editor, block?.id, clearHover]);
  useEffect(() => { setPlusHot(false); }, [block?.id]);
  useEffect(() => {
    if (plusHot && empty && shouldShow && block && insertMenuId !== block.id) {
      hoverTimer.current = window.setTimeout(openInsert, 180);
    }
    return clearHover;
  }, [plusHot, empty, shouldShow, block?.id, insertMenuId, openInsert, clearHover]);
  useEffect(() => {
    if (!slashShown) setInsertMenuId(undefined);
  }, [slashShown]);
  useEffect(() => {
    const blur = () => {
      clearHover();
      setPlusHot(false);
      setMenuBlockId(undefined);
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

  if (!shouldShow || !referencePos || !block) return null;
  const top = tableMenuTop ?? firstLineCenter ?? (referencePos.top + Math.min(referencePos.height / 2, 14));
  const scale = Number.parseFloat(getComputedStyle(editor.prosemirrorView.dom).getPropertyValue("--editor-ui-scale")) || 1;
  const width = (empty ? 24 : showHeadingToggle ? 64 : 44) * scale;
  const left = blockHandleLeft(referencePos.left - sideMenuGap, width, { left: 0, right: window.innerWidth });
  const portalTarget = editor.prosemirrorView.dom.closest(".workspace-main-sheet") ? document.body : (editor.portalElement ?? document.body);
  return createPortal(
    <div ref={menuRef} className="bn-side-menu goose-block-handle fixed z-[70]"
      data-heading-gutter={block.type !== "table" ? "true" : undefined}
      style={{ top, left, transform: "translateY(-50%)", pointerEvents: "auto" }}
      onMouseDown={(event) => { if (!(event.target as Element).closest("[draggable='true']")) event.preventDefault(); event.stopPropagation(); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <div className="goose-editor-inline-context-ui goose-block-handle-controls">
        {showHeadingToggle && <EditorAction type="button" className="goose-block-handle-button goose-block-fold" draggable={false}
          aria-expanded={headingExpanded} aria-label={headingExpanded ? t("collapse") : t("expand")}
          onClick={() => { toggleHeadingCollapsed(editor, block.id); setFoldTick((tick) => tick + 1); }}>
          <ChevronRight aria-hidden="true" className={headingExpanded ? "rotate-90" : undefined} />
        </EditorAction>}
        {empty ? <EditorAction type="button" className="goose-block-handle-button goose-empty-block-add" aria-label={t("add")}
          onPointerEnter={() => { setPlusHot(true); }}
          onPointerLeave={() => { setPlusHot(false); clearHover(); }} onClick={openInsert}><Plus aria-hidden="true" /></EditorAction>
          : <BlockHandleMenu editor={editor} block={block} open={menuBlockId === block.id} anchor={referencePos}
            onOpenChange={(open) => setMenuBlockId(open ? block.id : undefined)}
            headingFold={showHeadingToggle ? { expanded: headingExpanded, onToggle: () => setFoldTick((tick) => tick + 1) } : undefined}>
            <EditorAction type="button" className="goose-block-handle-button" aria-label={t("menu")}
              draggable={blockHandleCapabilities(editor, block).draggable}
              onPointerDown={() => { pressedHandle.current = true; }} onPointerUp={() => { pressedHandle.current = false; }}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <BlockHandleIcon block={block} /><GripVertical aria-hidden="true" />
            </EditorAction>
          </BlockHandleMenu>}
      </div>
    </div>, portalTarget,
  );
}
