import { useLayoutEffect, type RefObject } from "react";

const positions = new Map<string, number>();
export const hasNotebookTreeScroll = (notebookId: string | null) =>
  notebookId !== null && positions.has(notebookId);

/** 树保持挂载；切本单独记住列表位置，不触碰正文滚动。 */
export function useNotebookTreeScroll(
  notebookId: string | null,
  containerRef: RefObject<HTMLDivElement | null>,
  treeReady: boolean,
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !notebookId || !treeReady) return;
    container.scrollTop = positions.get(notebookId) ?? 0;
    const remember = () => { positions.set(notebookId, container.scrollTop); };
    remember();
    container.addEventListener("scroll", remember, { passive: true });
    return () => { container.removeEventListener("scroll", remember); };
  }, [notebookId, containerRef, treeReady]);
}
