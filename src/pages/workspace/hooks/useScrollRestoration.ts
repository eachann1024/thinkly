import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

const pageScrollPositions: Record<string, number> = {};

export function useScrollRestoration(
  pageId: string | null | undefined,
  externalRef?: RefObject<HTMLDivElement | null>,
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = externalRef ?? internalRef;
  const pendingRestoration = useRef<(() => void) | null>(null);
  const cancelPendingRestoration = useCallback(() => {
    pendingRestoration.current?.();
    pendingRestoration.current = null;
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !pageId) return;

    const handleScroll = () => {
      pageScrollPositions[pageId] = container.scrollTop;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      pageScrollPositions[pageId] = container.scrollTop;
      container.removeEventListener("scroll", handleScroll);
    };
  }, [pageId, scrollContainerRef]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!pageId || !container) return;

    const savedTop = pageScrollPositions[pageId];
    const targetTop = typeof savedTop === "number" ? savedTop : 0;

    const restoreScroll = () => {
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer) return;
      currentContainer.scrollTop = targetTop;
    };

    const frame = requestAnimationFrame(restoreScroll);
    const timer = window.setTimeout(restoreScroll, 0);
    const cancel = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    pendingRestoration.current = cancel;

    return () => {
      cancel();
      if (pendingRestoration.current === cancel) pendingRestoration.current = null;
    };
  }, [pageId, scrollContainerRef]);

  return { scrollContainerRef, cancelPendingRestoration };
}
