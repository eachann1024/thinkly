import { useEffect } from "react";
import {
  QUICKNOTE_MIN_WIDTH,
  QUICKNOTE_MIN_HEIGHT,
} from "@/stores/useQuickNote";
import { quickNoteWindow } from "@/lib/electron/quickNoteWindow";
import {
  POSITION_POLL_IDLE_MS,
  POSITION_POLL_DRAG_MS,
  POSITION_SETTLE_MS,
} from "./shared";
import type { useQuickNoteShortcuts } from "./useQuickNoteShortcuts";
import { useQuickNoteWindowTitle } from "./useQuickNoteWindowTitle";

export function useQuickNoteWindowPlacement(
  input: ReturnType<typeof useQuickNoteShortcuts>,
) {
  const {
    setWindowSize,
    setWindowPosition,
    isResizingRef,
    resizeSettleTimerRef,
  } = input;

  useEffect(() => {
    let lastX = window.screenX;
    let lastY = window.screenY;
    let settleTimer: number | null = null;
    let pollTimer: number | null = null;
    let pollMs = POSITION_POLL_IDLE_MS;

    const stopPoll = () => {
      if (pollTimer === null) return;
      window.clearInterval(pollTimer);
      pollTimer = null;
    };

    const startPoll = (ms: number) => {
      stopPoll();
      pollMs = ms;
      pollTimer = window.setInterval(() => {
        const x = window.screenX;
        const y = window.screenY;
        if (x === lastX && y === lastY) return;
        lastX = x;
        lastY = y;
        if (settleTimer !== null) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          settleTimer = null;
          const sx = window.screenX;
          const sy = window.screenY;
          quickNoteWindow.persistPosition(sx, sy);
          setWindowPosition(sx, sy);
          if (pollMs !== POSITION_POLL_IDLE_MS)
            startPoll(POSITION_POLL_IDLE_MS);
        }, POSITION_SETTLE_MS);
        if (pollMs !== POSITION_POLL_DRAG_MS) startPoll(POSITION_POLL_DRAG_MS);
      }, ms);
    };

    const syncPolling = () => {
      const shouldPoll =
        document.visibilityState === "visible" && document.hasFocus();
      if (shouldPoll) {
        if (pollTimer === null) startPoll(pollMs);
        return;
      }
      stopPoll();
    };

    syncPolling();
    document.addEventListener("visibilitychange", syncPolling);
    window.addEventListener("focus", syncPolling);
    window.addEventListener("blur", syncPolling);
    return () => {
      stopPoll();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", syncPolling);
      window.removeEventListener("focus", syncPolling);
      window.removeEventListener("blur", syncPolling);
    };
  }, [setWindowPosition]);

  useEffect(() => {
    const onResize = () => {
      isResizingRef.current = true;
      if (resizeSettleTimerRef.current !== null) {
        window.clearTimeout(resizeSettleTimerRef.current);
      }
      resizeSettleTimerRef.current = window.setTimeout(() => {
        resizeSettleTimerRef.current = null;
        isResizingRef.current = false;
        quickNoteWindow.persistSize();
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w >= QUICKNOTE_MIN_WIDTH && h >= QUICKNOTE_MIN_HEIGHT) {
          setWindowSize(w, h);
        }
      }, 240);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (resizeSettleTimerRef.current !== null) {
        window.clearTimeout(resizeSettleTimerRef.current);
        resizeSettleTimerRef.current = null;
      }
      window.removeEventListener("resize", onResize);
    };
  }, [setWindowSize]);
  const windowTitle = useQuickNoteWindowTitle();
  return { ...input, windowTitle };
}
