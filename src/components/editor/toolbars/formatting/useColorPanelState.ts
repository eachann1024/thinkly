import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useReducer,
} from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import {
  restoreSelectionAfterFormat,
  snapshotCurrentSelection,
  withPreservedSelection,
} from "./selectionRestore";
import {
  measureColorPanelPosition,
} from "./colorPanelGeometry";
import {
  resolveOpenColorState,
  applyHeldColorPatch,
} from "./heldColorSelection";
import { colorPanelReducer } from "./colorPanelState";
import { MIXED } from "./colorPalette";
import type { useSelectionColorState } from "./useSelectionColors";

export function useColorPanelState(
  editor: BlockNoteEditor<any, any, any>,
  selectionColors: ReturnType<typeof useSelectionColorState>,
  onOpenChange?: (open: boolean) => void,
) {
  const [panelState, dispatch] = useReducer(colorPanelReducer, { phase: "unmounted" });
  const isMounted = panelState.phase !== "unmounted";
  const isOpen = panelState.phase === "open";
  const position = panelState.phase === "unmounted" ? null : panelState.position;
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openFrameRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sideLockRef = useRef<boolean | null>(null);
  const heldSelectionRef = useRef<ReturnType<
    typeof snapshotCurrentSelection
  > | null>(null);
  const selectionColorsRef = useRef(selectionColors);
  selectionColorsRef.current = selectionColors;
  const [heldColors, setHeldColors] = useState(selectionColors);

  const updatePanelPosition = useCallback((allowFlip = false) => {
    if (!buttonRef.current) return;
    const next = measureColorPanelPosition(
      buttonRef.current,
      panelRef.current,
      allowFlip ? undefined : (sideLockRef.current ?? undefined),
    );
    sideLockRef.current = next.showAbove;
    dispatch({ type: "position-measured", position: next });
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeAnimTimeoutRef.current)
        clearTimeout(closeAnimTimeoutRef.current);
      if (openFrameRef.current != null) {
        cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onOpenChange?.(isMounted);
  }, [isMounted, onOpenChange]);

  useEffect(() => {
    return () => onOpenChange?.(false);
  }, [onOpenChange]);

  const holdCurrentSelection = useCallback(() => {
    const { selection } = editor.prosemirrorState;
    if (!selection.empty)
      heldSelectionRef.current = snapshotCurrentSelection(editor);
    if (selection instanceof TextSelection && !selection.empty) {
      setFakeSelection(editor, { from: selection.from, to: selection.to });
    }
    return heldSelectionRef.current;
  }, [editor]);

  const applyWithHeldSelection = useCallback(
    (
      apply: () => void,
      patch?: Partial<Pick<typeof heldColors, "textColor" | "backgroundColor">>,
    ) => {
      if (heldSelectionRef.current) {
        restoreSelectionAfterFormat(editor, heldSelectionRef.current);
      }
      withPreservedSelection(editor, apply);
      if (patch) {
        setHeldColors((prev) => applyHeldColorPatch(prev, patch));
      }
      holdCurrentSelection();
    },
    [editor, holdCurrentSelection],
  );

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (closeAnimTimeoutRef.current) clearTimeout(closeAnimTimeoutRef.current);
    if (!buttonRef.current) return;

    onOpenChange?.(true);
    if (!isMounted && !editor.prosemirrorState.selection.empty) {
      setHeldColors(selectionColorsRef.current);
    }
    holdCurrentSelection();

    const next = position ?? measureColorPanelPosition(buttonRef.current, panelRef.current);
    sideLockRef.current = next.showAbove;
    dispatch({ type: "pointer-entered", position: next });
  };

  useLayoutEffect(() => {
    if (!isMounted || !buttonRef.current) return;
    updatePanelPosition(false);
  }, [isMounted, updatePanelPosition]);

  useEffect(() => {
    if (!isMounted) return;
    const update = () => updatePanelPosition(true);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
      window.removeEventListener("resize", update);
    };
  }, [isMounted, updatePanelPosition]);

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      dispatch({ type: "leave-delay-completed" });
    }, 150);
  };

  useEffect(() => {
    if (panelState.phase === "entering") {
      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = requestAnimationFrame(() => {
          dispatch({ type: "entry-completed" });
          openFrameRef.current = null;
        });
      });
      return () => {
        if (openFrameRef.current != null) cancelAnimationFrame(openFrameRef.current);
        openFrameRef.current = null;
      };
    }
    if (panelState.phase === "leaving") {
      closeAnimTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "exit-completed" });
      }, 180);
      return () => {
        if (closeAnimTimeoutRef.current) clearTimeout(closeAnimTimeoutRef.current);
        closeAnimTimeoutRef.current = null;
      };
    }
    if (panelState.phase === "unmounted") {
      sideLockRef.current = null;
      heldSelectionRef.current = null;
      setFakeSelection(editor, null);
    }
  }, [editor, panelState.phase]);

  useEffect(() => {
    if (!isMounted) return;
    holdCurrentSelection();
  }, [editor, holdCurrentSelection, isMounted]);

  const displayColors = resolveOpenColorState(
    selectionColors,
    heldColors,
    isMounted,
  );
  const currentTextColor = displayColors.textColor;
  const currentBgColor = displayColors.backgroundColor;
  const isTextMixed = currentTextColor === MIXED;
  const isBgMixed = currentBgColor === MIXED;

  const isTextColorActive =
    !isTextMixed && currentTextColor && currentTextColor !== "default";
  const isBgColorActive =
    !isBgMixed && currentBgColor && currentBgColor !== "default";

  return {
    isOpen,
    isMounted,
    position,
    buttonRef,
    panelRef,
    handleMouseEnter,
    handleMouseLeave,
    displayColors,
    currentTextColor,
    currentBgColor,
    isTextMixed,
    isBgMixed,
    isTextColorActive,
    isBgColorActive,
    applyWithHeldSelection,
  };
}
