import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";

export function sameAnchorRect(a: DOMRect | null, b: DOMRect): boolean {
  return !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** Only ancestor scrolling can move this anchor; combine those events into one read. */
export function observeAnchorRect(
  getAnchor: () => HTMLElement | null,
  onRect: (rect: DOMRect) => void,
): () => void {
  let frame = 0;
  const measure = () => {
    frame = 0;
    const anchor = getAnchor();
    if (anchor?.isConnected) onRect(anchor.getBoundingClientRect());
  };
  const schedule = (event?: Event) => {
    if (event?.type === "scroll") {
      const anchor = getAnchor();
      const target = event.target;
      if (!anchor || (target instanceof Element && !target.contains(anchor))) return;
    }
    if (!frame) frame = requestAnimationFrame(measure);
  };
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, schedule);
  schedule();
  return () => {
    if (frame) cancelAnimationFrame(frame);
    document.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
    window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, schedule);
  };
}
