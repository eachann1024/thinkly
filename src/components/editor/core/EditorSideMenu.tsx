import { EditorAction } from "@/components/editor/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor, useExtension } from "@blocknote/react";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ChevronRight, GripVertical } from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import { ensureBlockMoveDragging } from "./ensureBlockMoveDragging";
import {
  queryHeadingTextRect,
  toggleHeadingCollapsed,
} from "@/components/editor/core/toggleHeadingGutter";
import { useEditorSideMenuTarget } from "./useEditorSideMenuTarget";

export function EditorSideMenu() {
  const editor = useBlockNoteEditor<any, any, any>();
  const sideMenu = useExtension(SideMenuExtension);
  const menuRef = useRef<HTMLDivElement>(null);
  const pressedHandle = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [foldHot, setFoldHot] = useState(false);
  const {
    block,
    referencePos,
    shouldShow,
    showHeadingToggle,
    headingExpanded,
    sideMenuGap,
    setFoldTick,
  } = useEditorSideMenuTarget(editor, isDragging, menuRef, pressedHandle);

  const handleToggleHeading = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!block) return;
      toggleHeadingCollapsed(editor, block.id);
      setFoldTick((tick) => tick + 1);
    },
    [block, editor, setFoldTick],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      if (!block || !sideMenu) return;
      setIsDragging(true);
      sideMenu.blockDragStart(
        { dataTransfer: event.dataTransfer, clientY: event.clientY },
        block,
      );
      ensureBlockMoveDragging(editor.prosemirrorView, event.dataTransfer);
    },
    [block, editor, sideMenu],
  );

  const handleDragEnd = useCallback(() => {
    pressedHandle.current = false;
    setIsDragging(false);
    sideMenu?.blockDragEnd?.();
  }, [sideMenu]);

  useEffect(() => {
    if (!isDragging) return;
    // Moving a block can unmount its handle before native dragend fires.
    const onDrop = () => window.setTimeout(handleDragEnd, 0);
    document.addEventListener("drop", onDrop, true);
    return () => document.removeEventListener("drop", onDrop, true);
  }, [isDragging, handleDragEnd]);

  if (!shouldShow || !referencePos || !block) return null;

  const textRect = block.type === "heading" ? queryHeadingTextRect(block.id) : null;
  const top = textRect
    ? textRect.top + textRect.height / 2
    : referencePos.top + referencePos.height / 2;
  const portalTarget = editor.prosemirrorView.dom.closest(".workspace-main-sheet")
    ? document.body
    : (editor.portalElement ?? document.body);

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        "bn-side-menu fixed z-[70]",
        "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
        "[body[data-scroll-locked]_&]:!opacity-0 [body[data-scroll-locked]_&]:!pointer-events-none",
      )}
      data-heading-gutter={block.type !== "table" ? "true" : undefined}
      style={{
        top,
        left: referencePos.left - sideMenuGap,
        transform: "translate(-100%, -50%)",
        transformOrigin: "right center",
        pointerEvents: "auto",
      }}
      onMouseDown={(event) => {
        if (!(event.target as Element).closest("[draggable='true']"))
          event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="goose-editor-inline-context-ui flex items-center">
        {showHeadingToggle ? (
          <EditorAction
            type="button"
            draggable={false}
            aria-expanded={headingExpanded}
            aria-label={headingExpanded ? "收起章节" : "展开章节"}
            data-fold-hot={foldHot ? "true" : undefined}
            onMouseEnter={() => setFoldHot(true)}
            onMouseLeave={() => setFoldHot(false)}
            onClick={handleToggleHeading}
            className={cn(
              "goose-heading-fold-btn flex h-6 w-[22px] cursor-pointer items-center justify-center rounded-[7px]",
              "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
            )}
          >
            <span
              className={cn(
                "inline-flex transition-transform duration-150 ease-out motion-reduce:transition-none",
                headingExpanded ? "rotate-90" : "rotate-0",
              )}
              aria-hidden
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </EditorAction>
        ) : null}
        <EditorAction
          type="button"
          draggable
          aria-label="拖动移动块"
          onPointerDown={() => {
            pressedHandle.current = true;
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onPointerUp={() => {
            pressedHandle.current = false;
          }}
          className="flex h-6 w-[22px] cursor-grab items-center justify-center rounded-[7px] text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </EditorAction>
      </div>
    </div>,
    portalTarget,
  );
}
