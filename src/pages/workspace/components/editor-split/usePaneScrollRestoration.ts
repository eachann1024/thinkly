import { useLayoutEffect, useRef, type RefObject } from "react";
import { useScrollRestoration } from "@/pages/workspace/hooks/useScrollRestoration";

// Keep a live pane's own position, including when another tab shows the same
// page. The existing page-level memory remains the fallback after LRU eviction.
export function usePaneScrollRestoration(pageId: string, scrollRef: RefObject<HTMLDivElement | null>) {
  const restoration = useScrollRestoration(pageId, scrollRef);
  const position = useRef<{ pageId: string; top: number } | null>(null);
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (position.current?.pageId === pageId) {
      restoration.cancelPendingRestoration();
      container.scrollTop = position.current.top;
    } else {
      position.current = { pageId, top: container.scrollTop };
    }
    const remember = () => {
      if (container.getClientRects().length) position.current = { pageId, top: container.scrollTop };
    };
    container.addEventListener("scroll", remember, { passive: true });
    return () => {
      remember();
      container.removeEventListener("scroll", remember);
    };
  }, [pageId, scrollRef, restoration.cancelPendingRestoration]);
  return restoration;
}
