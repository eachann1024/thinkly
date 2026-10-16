import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { QUICKNOTE_SLOTS, type QuickNoteSlot } from "@/stores/useQuickNote";
import type { useQuickNoteSlotPreview } from "./useQuickNoteSlotPreview";

export function useQuickNoteSlotInput(
  input: ReturnType<typeof useQuickNoteSlotPreview>,
) {
  const {
    activeSlot,
    onChange,
    rootRef,
    scrubRef,
    sendScrub,
    activeSlotRef,
    slotFromPoint,
  } = input;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (scrubRef.current.phase !== "idle") return;
    const idx = QUICKNOTE_SLOTS.indexOf(activeSlot);
    let targetSlot: QuickNoteSlot | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      targetSlot = QUICKNOTE_SLOTS[(idx + 1) % QUICKNOTE_SLOTS.length]!;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      targetSlot =
        QUICKNOTE_SLOTS[
          (idx - 1 + QUICKNOTE_SLOTS.length) % QUICKNOTE_SLOTS.length
        ]!;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetSlot = 1;
    } else if (e.key === "End") {
      e.preventDefault();
      targetSlot = 5;
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      targetSlot = Number(e.key) as QuickNoteSlot;
    }
    if (targetSlot === null) return;
    onChange(targetSlot, "switcher-keyboard");
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-slot="${targetSlot}"]`)
        ?.focus();
    });
  };

  const stopWindowScrubListeners = useRef<(() => void) | null>(null);
  const sequence = useRef(0);

  const detachWindowScrubListeners = () => {
    stopWindowScrubListeners.current?.();
    stopWindowScrubListeners.current = null;
  };

  useEffect(() => () => detachWindowScrubListeners(), []);

  const onPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    slot: QuickNoteSlot,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    detachWindowScrubListeners();
    const id = ++sequence.current;
    sendScrub({ type: "pressed", id, slot });
    // 普通点击不闪变拖动指针；持续按住后才显示横向切换提示。
    const holdTimer = window.setTimeout(() => sendScrub({ type: "hold-elapsed", id }), 180);
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const next = slotFromPoint(ev.clientX, ev.clientY);
      if (next != null) sendScrub({ type: "moved", id, slot: next });
    };
    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const transaction = scrubRef.current;
      if (transaction.phase === "idle" || transaction.id !== id) return;
      detachWindowScrubListeners();
      const next = slotFromPoint(ev.clientX, ev.clientY) ?? transaction.previewSlot;
      sendScrub({ type: "released", id, slot: next, activeSlot: activeSlotRef.current });
    };
    const cancel = () => {
      if (scrubRef.current.phase === "idle" || scrubRef.current.id !== id) return;
      detachWindowScrubListeners();
      sendScrub({ type: "cancelled", id });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    stopWindowScrubListeners.current = () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    };
  };

  const onRootPointerLeave = () => {
    // 「移走就生效」：拖动中指针离开切换器时提交当前预览槽
    const transaction = scrubRef.current;
    if (transaction.phase === "idle") return;
    detachWindowScrubListeners();
    sendScrub({ type: "left", id: transaction.id });
  };
  return {
    ...input,
    onKeyDown,
    stopWindowScrubListeners,
    detachWindowScrubListeners,
    onPointerDown,
    onRootPointerLeave,
  };
}
