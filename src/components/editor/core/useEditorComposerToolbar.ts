import { useEffect, useMemo, useRef, useState } from "react";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import {
  useEditorState,
  useExtensionState,
  type FloatingUIOptions,
} from "@blocknote/react";
import {
  autoUpdate as floatingAutoUpdate,
  flip as floatingFlip,
  offset as floatingOffset,
  shift as floatingShift,
  size as floatingSize,
  type Middleware,
} from "@floating-ui/react";
import { shouldRenderFormattingToolbar } from "@/components/editor/toolbars/formatting";
import {
  getFormattingSelectionMode,
  isFormattingToolbarOpen,
} from "@/components/editor/toolbars/formatting/helpers";
import { useBlockHandleMenuOpen } from "../state/blockHandleMenu";
import { useFormattingToolbarAi } from "@/components/editor/state/formattingToolbarAi";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { findNonOverlappingToolbarPosition } from "@/components/editor/utils/formattingToolbarPosition";
import { getMultiBlockToolbarEdgeRect } from "@/components/editor/utils/formattingToolbarReference";
import {
  EDITOR_CONTEXT_UI_GAP,
  getScaledEditorUiPx,
} from "@/components/editor/utils/editorContextUi";
import type { EditorComposerProps } from "./editorComposerTypes";

function getFormattingToolbarGap(): number {
  return getScaledEditorUiPx(EDITOR_CONTEXT_UI_GAP);
}

export function useEditorComposerToolbar(
  {
    editor,
    editable,
    editorContainerRef,
    suppressFormattingToolbar = false,
  }: Pick<
    EditorComposerProps,
    "editor" | "editable" | "editorContainerRef" | "suppressFormattingToolbar"
  >,
  closeLinkPopover: () => void,
) {
  const blockHandleMenuOpen = useBlockHandleMenuOpen(editor);
  const formattingToolbarStoreOpen = useExtensionState(
    FormattingToolbarExtension,
    { editor },
  );
  const formattingToolbarSelectionAllowed = useEditorState({
    editor,
    on: "selection",
    selector: ({ editor }) => shouldRenderFormattingToolbar(editor),
  });
  const formattingToolbarAiActive = useFormattingToolbarAi(
    (s) => s.active && s.owner === editor,
  );
  const resetFormattingToolbarAi = useFormattingToolbarAi((s) => s.reset);
  const [holdFormattingToolbar, setHoldFormattingToolbar] = useState(false);
  const holdFormattingToolbarRef = useRef(false);
  const toolbarOpenForHoldRef = useRef(false);
  useEffect(() => {
    if (!editable) {
      closeLinkPopover();
      resetFormattingToolbarAi(editor);
    }
  }, [editable, editor, resetFormattingToolbarAi, closeLinkPopover]);

  const formattingToolbarOpen = isFormattingToolbarOpen({
    editable,
    suppress: suppressFormattingToolbar || blockHandleMenuOpen,
    aiActive: formattingToolbarAiActive,
    storeOpen: formattingToolbarStoreOpen,
    selectionAllowed: formattingToolbarSelectionAllowed,
    holdDuringPointerSelect: holdFormattingToolbar,
  });
  toolbarOpenForHoldRef.current = formattingToolbarOpen;

  useEffect(() => {
    const dom = editor.domElement;
    if (!dom) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (holdFormattingToolbarRef.current) return;
      if (!toolbarOpenForHoldRef.current) return;
      holdFormattingToolbarRef.current = true;
      setHoldFormattingToolbar(true);
    };
    const endHold = () => {
      if (!holdFormattingToolbarRef.current) return;
      holdFormattingToolbarRef.current = false;
      setHoldFormattingToolbar(false);
    };

    dom.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);
    window.addEventListener("blur", endHold);
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", endHold);
      window.removeEventListener("pointercancel", endHold);
      window.removeEventListener("blur", endHold);
      if (!holdFormattingToolbarRef.current) return;
      holdFormattingToolbarRef.current = false;
      setHoldFormattingToolbar(false);
    };
  }, [editor, editor.domElement]);

  const formattingToolbarFloatingOptions = useMemo<FloatingUIOptions>(() => {
    const boundary = editorContainerRef.current ?? undefined;
    const overflowOptions = { boundary, padding: 8 };
    const avoidSelectionOverlap: Middleware = {
      name: "gooseAvoidSelectionOverlap",
      fn({ placement, rects, elements }) {
        const editorRect = editorContainerRef.current?.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const padding = 8;
        const left = Math.max(padding, editorRect?.left ?? padding);
        const top = Math.max(padding, editorRect?.top ?? padding);
        const right = Math.min(
          viewportWidth - padding,
          editorRect?.right ?? viewportWidth - padding,
        );
        const bottom = Math.min(
          viewportHeight - padding,
          editorRect?.bottom ?? viewportHeight - padding,
        );
        const preferredSide = placement.split("-")[0] as
          | "top"
          | "bottom"
          | "left"
          | "right";
        let reference = {
          top: rects.reference.y,
          right: rects.reference.x + rects.reference.width,
          bottom: rects.reference.y + rects.reference.height,
          left: rects.reference.x,
          width: rects.reference.width,
          height: rects.reference.height,
        };
        if (getFormattingSelectionMode(editor) === "multiBlock") {
          reference = getMultiBlockToolbarEdgeRect(reference, preferredSide);
        }
        const next = findNonOverlappingToolbarPosition({
          reference,
          floating: rects.floating,
          boundary: {
            top,
            right,
            bottom,
            left,
            width: Math.max(0, right - left),
            height: Math.max(0, bottom - top),
          },
          preferredSide,
          gap: getFormattingToolbarGap(),
        });

        if (!next) {
          elements.floating.style.visibility = "hidden";
          elements.floating.style.pointerEvents = "none";
          return {};
        }
        elements.floating.style.visibility = "visible";
        elements.floating.style.pointerEvents = "auto";
        return next;
      },
    };

    return {
      useFloatingOptions: {
        open: formattingToolbarOpen,
        strategy: "fixed" as const,
        placement: "top" as const,
        middleware: [
          floatingOffset(() => getFormattingToolbarGap()),
          floatingFlip({
            ...overflowOptions,
            fallbackPlacements: ["bottom"],
          }),
          floatingShift(overflowOptions),
          floatingSize({
            ...overflowOptions,
            apply({ availableWidth, elements }) {
              const safeAvailableWidth = Math.max(0, availableWidth);
              elements.floating.style.maxWidth = `${safeAvailableWidth}px`;
              elements.floating.style.overflowX = "visible";
              const toolbar = elements.floating.querySelector<HTMLElement>(
                "[data-formatting-toolbar]",
              );
              if (toolbar) {
                toolbar.style.maxWidth = `${safeAvailableWidth}px`;
              }
            },
          }),
          avoidSelectionOverlap,
        ],
        whileElementsMounted(reference, floating, update) {
          const cleanup = floatingAutoUpdate(reference, floating, update, {
            animationFrame: true,
          });
          window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
          return () => {
            window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
            cleanup();
          };
        },
      },
    };
  }, [editor, editorContainerRef, formattingToolbarOpen]);

  return {
    formattingToolbarOpen,
    formattingToolbarFloatingOptions,
    holdFormattingToolbar,
  };
}
