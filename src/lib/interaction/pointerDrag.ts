const activeScopes = new Map<string, number>();

export function isPointerDragActive(scope: string) {
  return (activeScopes.get(scope) ?? 0) > 0;
}

export function startPointerDrag(options: {
  target: HTMLElement;
  pointerId: number;
  startX: number;
  startY?: number;
  scope?: string;
  cursor?: string;
  onMove: (clientX: number, clientY: number) => void;
  onEnd: () => void;
  onCancel?: () => void;
}) {
  const { target, pointerId, onMove, onEnd, scope } = options;
  let active = true;
  let clientX = options.startX;
  let clientY = options.startY ?? 0;
  let frame: number | null = null;
  const doc = target.ownerDocument;
  const host = doc.defaultView ?? window;
  const body = doc.body;
  const previousCursor = body.style.cursor;
  const previousUserSelect = body.style.userSelect;
  if (scope) activeScopes.set(scope, (activeScopes.get(scope) ?? 0) + 1);
  const flush = () => {
    frame = null;
    onMove(clientX, clientY);
  };
  const cleanup = () => {
    if (!active) return;
    active = false;
    if (frame !== null) host.cancelAnimationFrame(frame);
    frame = null;
    host.removeEventListener("pointermove", move, true);
    host.removeEventListener("pointerup", up, true);
    host.removeEventListener("pointercancel", cancel, true);
    host.removeEventListener("blur", abort);
    host.removeEventListener("resize", abort);
    host.removeEventListener("keydown", keydown, true);
    doc.removeEventListener("visibilitychange", visibility);
    target.removeEventListener("lostpointercapture", cancel);
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    if (scope) {
      const count = (activeScopes.get(scope) ?? 1) - 1;
      if (count) activeScopes.set(scope, count);
      else activeScopes.delete(scope);
    }
    body.style.cursor = previousCursor;
    body.style.userSelect = previousUserSelect;
  };
  const finish = () => {
    if (!active) return;
    if (frame !== null) host.cancelAnimationFrame(frame);
    flush();
    cleanup();
    onEnd();
  };
  const abort = () => {
    if (!active) return;
    if (!options.onCancel) { finish(); return; }
    cleanup();
    options.onCancel();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clientX = event.clientX;
    clientY = event.clientY;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      finish();
      return;
    }
    if (frame === null) frame = host.requestAnimationFrame(flush);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clientX = event.clientX;
    clientY = event.clientY;
    finish();
  };
  const cancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) abort();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.isComposing || event.keyCode === 229 ||
      event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    abort();
  };
  const visibility = () => { if (doc.hidden) abort(); };
  host.addEventListener("pointermove", move, true);
  host.addEventListener("pointerup", up, true);
  host.addEventListener("pointercancel", cancel, true);
  host.addEventListener("blur", abort);
  host.addEventListener("resize", abort);
  host.addEventListener("keydown", keydown, true);
  doc.addEventListener("visibilitychange", visibility);
  target.addEventListener("lostpointercapture", cancel);
  body.style.cursor = options.cursor ?? previousCursor;
  body.style.userSelect = "none";
  target.setPointerCapture(pointerId);
  return { finish, cancel: abort, dispose: cleanup };
}
