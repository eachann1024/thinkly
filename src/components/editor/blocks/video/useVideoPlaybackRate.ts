import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { createVideoPlaybackRateController, type VideoPlaybackRateState } from "./videoPlaybackRate";

export function useVideoPlaybackRate(
  src: string,
  videoRef: RefObject<HTMLVideoElement | null>,
  rootRef: RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<VideoPlaybackRateState>({ selectedRate: 1, boosting: false });
  const selectedRef = useRef(1);
  const controllerRef = useRef<ReturnType<typeof createVideoPlaybackRateController> | null>(null);
  const heldPointerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;
    const controller = createVideoPlaybackRateController(video, (next) => {
      selectedRef.current = next.selectedRate;
      setState(next);
    }, { schedule: (callback, delay) => window.setTimeout(callback, delay), cancel: window.clearTimeout }, selectedRef.current);
    controllerRef.current = controller;
    const endHold = () => {
      const pointer = heldPointerRef.current;
      heldPointerRef.current = null;
      controller.endHold();
      if (pointer !== null && root.hasPointerCapture(pointer)) root.releasePointerCapture(pointer);
    };
    const onUp = (event: globalThis.PointerEvent) => {
      if (heldPointerRef.current === event.pointerId) endHold();
    };
    const onMove = (event: globalThis.PointerEvent) => {
      if (heldPointerRef.current === event.pointerId && !(event.buttons & 2)) endHold();
    };
    const onVisibility = () => { if (document.hidden) endHold(); };
    const onRate = () => controller.syncRate();
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("blur", endHold);
    root.addEventListener("lostpointercapture", endHold);
    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("ratechange", onRate);
    return () => {
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("blur", endHold);
      root.removeEventListener("lostpointercapture", endHold);
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("ratechange", onRate);
      endHold();
      controllerRef.current = null;
    };
  }, [src, videoRef, rootRef]);

  return {
    ...state,
    selectRate: (rate: number) => controllerRef.current?.selectRate(rate),
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      heldPointerRef.current = event.pointerId;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch {   }
      controllerRef.current?.beginHold();
    },
  };
}
