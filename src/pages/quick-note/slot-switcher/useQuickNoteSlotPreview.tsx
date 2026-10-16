import { useCallback, useEffect, useReducer, useRef } from "react";
import { type QuickNoteSlot } from "@/stores/useQuickNote";
import { type QuickNoteSlotSwitcherProps, isQuickNoteSlot } from "./shared";
import { reduceQuickNoteSlot, transitionQuickNoteSlot, type QuickNoteSlotState, type QuickNoteSlotEvent } from "./quickNoteSlotState";

export function useQuickNoteSlotPreview({
  activeSlot,
  occupiedSlots,
  slotNames,
  onChange,
  onPreviewChange,
  onRenameRequest,
}: QuickNoteSlotSwitcherProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const [scrub, dispatch] = useReducer(reduceQuickNoteSlot, { phase: "idle" });
  const scrubRef = useRef<QuickNoteSlotState>(scrub);
  const onChangeRef = useRef(onChange);
  const onPreviewChangeRef = useRef(onPreviewChange);
  const onRenameRequestRef = useRef(onRenameRequest);
  const activeSlotRef = useRef(activeSlot);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onPreviewChangeRef.current = onPreviewChange; }, [onPreviewChange]);
  useEffect(() => { onRenameRequestRef.current = onRenameRequest; }, [onRenameRequest]);
  useEffect(() => { activeSlotRef.current = activeSlot; }, [activeSlot]);
  const sendScrub = useCallback((event: QuickNoteSlotEvent) => {
    const result = transitionQuickNoteSlot(scrubRef.current, event);
    scrubRef.current = result.state;
    dispatch(event);
    for (const command of result.commands) {
      if (command.type === "preview") onPreviewChangeRef.current?.(command.slot);
      else if (command.type === "commit") onChangeRef.current(command.slot, "pointer");
      else onRenameRequestRef.current(command.slot);
    }
  }, []);
  const visualSlot = scrub.phase === "idle" ? activeSlot : scrub.previewSlot;

  const slotFromPoint = (
    clientX: number,
    clientY: number,
  ): QuickNoteSlot | null => {
    const root = rootRef.current;
    if (!root) return null;

    // 仍在胶囊水平范围内时，按 X 投影到最近按钮（快速横滑不必严格命中圆心）
    const rootRect = root.getBoundingClientRect();
    const insideY =
      clientY >= rootRect.top - 8 && clientY <= rootRect.bottom + 8;
    const insideX = clientX >= rootRect.left && clientX <= rootRect.right;
    if (insideY && insideX) {
      const buttons = root.querySelectorAll<HTMLElement>("[data-slot]");
      let best: QuickNoteSlot | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const btn of buttons) {
        const n = Number(btn.dataset.slot);
        if (!isQuickNoteSlot(n)) continue;
        const rect = btn.getBoundingClientRect();
        if (rect.width <= 0) continue;
        const cx = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - cx);
        if (dist < bestDist) {
          bestDist = dist;
          best = n;
        }
      }
      if (best != null) return best;
    }

    const stack =
      typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(clientX, clientY)
        : [document.elementFromPoint(clientX, clientY)];
    for (const node of stack) {
      if (!(node instanceof Element)) continue;
      const btn = node.closest("[data-slot]");
      if (!(btn instanceof HTMLElement) || !root.contains(btn)) continue;
      const n = Number(btn.dataset.slot);
      if (isQuickNoteSlot(n)) return n;
    }
    return null;
  };
  return {
    activeSlot,
    occupiedSlots,
    slotNames,
    onChange,
    onPreviewChange,
    onRenameRequest,
    rootRef,
    scrub,
    scrubRef,
    sendScrub,
    activeSlotRef,
    scrubbing: scrub.phase !== "idle",
    held: scrub.phase === "held",
    visualSlot,
    slotFromPoint,
  };
}
