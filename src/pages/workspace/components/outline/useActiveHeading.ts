import { useEffect, useState } from "react";
import { findActiveHeadingIndex } from "./activeHeadingSearch";

export const OUTLINE_SCROLL_TARGET_OFFSET = 8;

const HEADING_TEXT_SELECTOR =
  '.bn-block-content[data-content-type="heading"] h1, .bn-block-content[data-content-type="heading"] h2, .bn-block-content[data-content-type="heading"] h3, .bn-block-content[data-content-type="heading"] h4, .bn-block-content[data-content-type="heading"] h5, .bn-block-content[data-content-type="heading"] h6';
const HEADING_CONTENT_SELECTOR =
  '.bn-block-content[data-content-type="heading"]';

export function getHeadingAnchorElement(
  container: HTMLElement,
  id: string,
): HTMLElement | null {
  const block = container.querySelector(
    `[data-id="${CSS.escape(id)}"]`,
  ) as HTMLElement | null;
  if (!block) return null;
  return (
    (block.querySelector(HEADING_TEXT_SELECTOR) as HTMLElement | null) ??
    (block.querySelector(HEADING_CONTENT_SELECTOR) as HTMLElement | null) ??
    block
  );
}

export function useActiveHeading(
  scrollContainerRef: React.RefObject<HTMLDivElement | null> | undefined,
  headingIds: string[],
) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || headingIds.length === 0) {
      setActiveId(null);
      return;
    }

    let frame: number | null = null;
    let cacheDirty = true;
    let headings: { id: string; element: HTMLElement }[] = [];
    const candidates = new Set<number>();
    const indexes = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = indexes.get(entry.target);
          if (index === undefined) continue;
          if (entry.isIntersecting) candidates.add(index);
          else candidates.delete(index);
        }
        schedule();
      },
      { root: container, threshold: 0 },
    );

    const rebuildCache = () => {
      observer.disconnect();
      candidates.clear();
      indexes.clear();
      headings = [];
      for (const id of headingIds) {
        const element = getHeadingAnchorElement(container, id);
        if (!element) continue;
        indexes.set(element, headings.length);
        headings.push({ id, element });
        observer.observe(element);
      }
      resizeObserver.disconnect();
      resizeObserver.observe(container);
      const editorContent = container.querySelector(".bn-editor");
      if (editorContent) resizeObserver.observe(editorContent);
      cacheDirty = false;
    };
    const findTopMost = () => {
      if (cacheDirty) rebuildCache();
      const containerTop = container.getBoundingClientRect().top;
      const measured = new Map<number, number>();
      const getY = (index: number) => {
        let y = measured.get(index);
        if (y === undefined) {
          y =
            headings[index].element.getBoundingClientRect().top - containerTop;
          measured.set(index, y);
        }
        return y;
      };
      const index = findActiveHeadingIndex(
        headings.length,
        getY,
        candidates,
        container.clientHeight,
        container.scrollHeight - container.scrollTop - container.clientHeight <=
          2,
      );
      const nextActiveId = index === null ? null : headings[index].id;
      setActiveId((current) =>
        current === nextActiveId ? current : nextActiveId,
      );
    };
    function schedule() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        findTopMost();
      });
    }

    // React/ProseMirror may replace heading DOM without changing the outline IDs.
    const containsHeading = (node: Node) =>
      node instanceof Element &&
      (node.matches(HEADING_CONTENT_SELECTOR + ",h1,h2,h3,h4,h5,h6") ||
        Boolean(node.querySelector(HEADING_CONTENT_SELECTOR)));
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === "attributes" ||
          [...record.addedNodes, ...record.removedNodes].some(containsHeading)
        ) {
          cacheDirty = true;
          break;
        }
      }
      schedule();
    });
    mutations.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-id", "data-content-type"],
    });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    container.addEventListener("scroll", schedule, { passive: true });
    // Media loads can move headings while the scroll container keeps its size.
    container.addEventListener("load", schedule, true);
    findTopMost();

    return () => {
      observer.disconnect();
      mutations.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener("scroll", schedule);
      container.removeEventListener("load", schedule, true);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [scrollContainerRef, headingIds]);

  return activeId;
}
