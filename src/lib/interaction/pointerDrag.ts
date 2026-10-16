/** A single captured pointer gesture, with one preview per frame and a final flush. */
export function startPointerDrag(options: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  cursor?: string;
  onMove: (clientX: number) => void;
  onEnd: () => void;
}) {
  const { target, pointerId, onMove, onEnd } = options;
  let active = true;
  let clientX = options.startX;
  let frame: number | null = null;
  const body = target.ownerDocument.body;
  const previousCursor = body.style.cursor;
  const previousUserSelect = body.style.userSelect;
  const flush = () => {
    frame = null;
    onMove(clientX);
  };
  const cleanup = () => {
    if (!active) return;
    active = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("blur", finish);
    window.removeEventListener("resize", finish);
    window.removeEventListener("keydown", keydown, true);
    document.removeEventListener("visibilitychange", visibility);
    target.removeEventListener("lostpointercapture", cancel);
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    body.style.cursor = previousCursor;
    body.style.userSelect = previousUserSelect;
  };
  const finish = () => {
    if (!active) return;
    cleanup();
    flush();
    onEnd();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clientX = event.clientX;
    // A release outside the host window may not send pointerup back to it.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      finish();
      return;
    }
    if (frame === null) frame = requestAnimationFrame(flush);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clientX = event.clientX;
    finish();
  };
  const cancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) finish();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  };
  const visibility = () => {
    if (document.hidden) finish();
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("blur", finish);
  window.addEventListener("resize", finish);
  window.addEventListener("keydown", keydown, true);
  document.addEventListener("visibilitychange", visibility);
  target.addEventListener("lostpointercapture", cancel);
  body.style.cursor = options.cursor ?? previousCursor;
  body.style.userSelect = "none";
  target.setPointerCapture(pointerId);
  return { finish, dispose: cleanup };
}
