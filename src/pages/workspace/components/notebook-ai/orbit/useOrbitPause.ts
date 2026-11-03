import { useEffect, type RefObject } from "react";

/** Pauses CSS orbit loops while the mark is off-screen or the window is hidden. */
export function useOrbitPause(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = false;
    const sync = () => {
      el.toggleAttribute("data-paused", document.hidden || !onScreen);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    if (observer) observer.observe(el);
    else onScreen = true;
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
}
