import { EditorAction } from "@/components/editor/ui/button";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor } from "@blocknote/react";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import {
  queryHeadingTextRect,
  toggleHeadingCollapsed,
} from "@/components/editor/core/toggleHeadingGutter";
import { useEditorSideMenuTarget } from "./useEditorSideMenuTarget";

export function EditorSideMenu() {
  const editor = useBlockNoteEditor<any, any, any>();
  const menuRef = useRef<HTMLDivElement>(null);
  const pressedHandle = useRef(false);
  const [foldHot, setFoldHot] = useState(false);
  const {
    block,
    referencePos,
    shouldShow,
    showHeadingToggle,
    headingExpanded,
    sideMenuGap,
    setFoldTick,
  } = useEditorSideMenuTarget(editor, false, menuRef, pressedHandle);

  const handleToggleHeading = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!block) return;
      toggleHeadingCollapsed(editor, block.id);
      setFoldTick((tick) => tick + 1);
    },
    [block, editor, setFoldTick],
  );

  if (!shouldShow || !showHeadingToggle || !referencePos || !block) return null;

  const textRect = queryHeadingTextRect(block.id);
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
      data-heading-gutter="true"
      style={{
        top,
        left: referencePos.left - sideMenuGap,
        transform: "translate(-100%, -50%)",
        transformOrigin: "right center",
        pointerEvents: "auto",
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="goose-editor-inline-context-ui flex items-center">
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
      </div>
    </div>,
    portalTarget,
  );
}
