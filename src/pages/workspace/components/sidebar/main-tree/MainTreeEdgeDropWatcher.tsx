import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { TreeItem } from "react-complex-tree";
import type { Page } from "@/types";
import {
  resolveMainTreeEdgeZone,
  type MainTreeEdgeZone,
} from "./mainTreeEdgeDrop";

interface EdgeDropIndicator {
  dragId: string;
  zone: MainTreeEdgeZone;
  top: number;
  left: number;
  width: number;
}

interface MainTreeEdgeDropWatcherProps {
  containerRef: RefObject<HTMLElement | null>;
  draggingItemId: string | null;
  draggedItem: TreeItem<Page> | undefined;
  onEdgeDrop: (zone: MainTreeEdgeZone, item: TreeItem<Page>) => void;
}

export function MainTreeEdgeDropWatcher({
  containerRef,
  draggingItemId,
  draggedItem,
  onEdgeDrop,
}: MainTreeEdgeDropWatcherProps) {
  const [indicator, setIndicator] = useState<EdgeDropIndicator | null>(null);
  const indicatorRef = useRef<EdgeDropIndicator | null>(null);
  const latestRef = useRef({ onEdgeDrop, draggedItem });

  useEffect(() => {
    latestRef.current = { onEdgeDrop, draggedItem };
  }, [onEdgeDrop, draggedItem]);

  const visible =
    indicator && indicator.dragId === draggingItemId ? indicator : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (visible) {
      container.setAttribute("data-main-tree-edge-drop", visible.zone);
    } else {
      container.removeAttribute("data-main-tree-edge-drop");
    }
    return () => container.removeAttribute("data-main-tree-edge-drop");
  }, [containerRef, visible]);

  useEffect(() => {
    if (!draggingItemId) return;
    const container = containerRef.current;
    if (!container) return;
    indicatorRef.current = null;

    const readEdge = (event: DragEvent) => {
      const viewportRect = container.getBoundingClientRect();
      const overNotebookControl =
        event.target instanceof Element &&
        event.target.closest(".sidebar-navigation-heading, .sidebar-notebook-footer, .goose-notebook-menu-surface");
      const rows = container.querySelectorAll(
        "[data-rct-item-container='true']",
      );
      const lastRow = rows[rows.length - 1];
      const lastRowBottom = lastRow
        ? lastRow.getBoundingClientRect().bottom
        : Number.POSITIVE_INFINITY;
      return {
        viewportRect,
        zone: overNotebookControl ? null : resolveMainTreeEdgeZone({
          pointerX: event.clientX,
          pointerY: event.clientY,
          viewportRect,
          lastRowBottom,
        }),
      };
    };

    const updateIndicator = (
      zone: MainTreeEdgeZone | null,
      viewportRect: { top: number; bottom: number; left: number; width: number },
    ) => {
      const current = indicatorRef.current;
      if (!zone) {
        if (!current) return;
        indicatorRef.current = null;
        setIndicator(null);
        return;
      }
      const next: EdgeDropIndicator = {
        dragId: draggingItemId,
        zone,
        top: zone === "top" ? viewportRect.top : viewportRect.bottom - 2,
        left: viewportRect.left + 6,
        width: Math.max(viewportRect.width - 14, 0),
      };
      if (
        current?.zone === next.zone &&
        current.top === next.top &&
        current.left === next.left &&
        current.width === next.width
      ) {
        return;
      }
      indicatorRef.current = next;
      setIndicator(next);
    };

    const handleWindowDragOver = (event: DragEvent) => {
      const { zone, viewportRect } = readEdge(event);
      if (zone) {
        event.preventDefault();
        event.stopPropagation();
      }
      updateIndicator(zone, viewportRect);
    };

    const handleWindowDrop = (event: DragEvent) => {
      const { zone } = readEdge(event);
      const item = latestRef.current.draggedItem;
      indicatorRef.current = null;
      setIndicator(null);
      if (!zone || !item) return;
      event.preventDefault();
      event.stopPropagation();
      latestRef.current.onEdgeDrop(zone, item);
    };

    window.addEventListener("dragover", handleWindowDragOver, true);
    window.addEventListener("drop", handleWindowDrop, true);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver, true);
      window.removeEventListener("drop", handleWindowDrop, true);
    };
  }, [containerRef, draggingItemId]);

  if (!visible) return null;

  return createPortal(
    <div
      aria-hidden
      className="main-tree-drop-between-line main-tree-edge-drop-line"
      style={{
        position: "fixed",
        top: visible.top,
        left: visible.left,
        width: visible.width,
        height: 2,
        marginLeft: 0,
        marginRight: 0,
      }}
    />,
    document.body,
  );
}
