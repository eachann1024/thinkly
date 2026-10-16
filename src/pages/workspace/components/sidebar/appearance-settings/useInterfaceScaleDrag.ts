import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { startPointerDrag } from "@/lib/interaction/pointerDrag";
import { UI_SCALE_MIN, UI_SCALE_MAX } from "@/stores/settings/types";

/** Root font changes move the range itself; keep the gesture in its starting coordinates. */
export function useInterfaceScaleDrag(
  layoutRef: RefObject<HTMLDivElement | null>,
  setScale: (scale: number) => void,
) {
  const gestureRef = useRef<ReturnType<typeof startPointerDrag> | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const [scaleDragLayout, setScaleDragLayout] = useState<"preview" | "options" | null>(null);
  const setterRef = useRef(setScale);
  useLayoutEffect(() => { setterRef.current = setScale; }, [setScale]);

  useEffect(() => () => {
    observerRef.current?.disconnect();
    gestureRef.current?.dispose();
  }, []);

  const lockScaleDragLayout = (event: PointerEvent<HTMLInputElement>) => {
    if (event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    const slider = event.currentTarget;
    slider.focus({ preventScroll: true });
    const rect = slider.getBoundingClientRect();
    // Chromium's native range thumb is 16px; its centre stays within the track.
    const thumbInset = 8;
    const trackStart = rect.left + thumbInset;
    const trackWidth = Math.max(1, rect.width - thumbInset * 2);
    const preview = layoutRef.current?.querySelector<HTMLElement>('[aria-label="编辑器即时预览"]');
    setScaleDragLayout(preview && getComputedStyle(preview).display !== "none" ? "preview" : "options");
    const scrollContainer = slider.closest<HTMLElement>(".settings-appearance-options");
    if (scrollContainer) {
      observerRef.current = new MutationObserver(() => {
        scrollContainer.scrollTop += slider.getBoundingClientRect().top - rect.top;
      });
      observerRef.current.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    }
    const update = (clientX: number) => {
      const fraction = Math.max(0, Math.min(1, (clientX - trackStart) / trackWidth));
      setterRef.current(Math.round(UI_SCALE_MIN + fraction * (UI_SCALE_MAX - UI_SCALE_MIN)));
    };
    gestureRef.current = startPointerDrag({
      target: slider,
      pointerId: event.pointerId,
      startX: event.clientX,
      onMove: update,
      onEnd: () => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        gestureRef.current = null;
        setScaleDragLayout(null);
      },
    });
    update(event.clientX);
  };

  const changeScale = (scale: number) => {
    if (!gestureRef.current) setterRef.current(scale);
  };

  return { scaleDragLayout, lockScaleDragLayout, changeScale };
}
