export function createMenuLayoutScheduler(
  update: () => void,
  request: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
) {
  let frame: number | undefined;
  let disposed = false;
  return {
    schedule() {
      if (disposed || frame !== undefined) return;
      frame = request(() => {
        frame = undefined;
        if (!disposed) update();
      });
    },
    flush() {
      if (disposed) return;
      if (frame !== undefined) cancel(frame);
      frame = undefined;
      update();
    },
    cancel() {
      disposed = true;
      if (frame !== undefined) cancel(frame);
      frame = undefined;
    },
  };
}
