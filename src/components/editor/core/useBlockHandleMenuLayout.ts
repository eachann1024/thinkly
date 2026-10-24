import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const padding = 8;
const gap = 6;
const menuWidth = 224;
const submenuWidth = 272;

export function useBlockHandleMenuLayout(root: HTMLElement, open: boolean, anchor: DOMRect) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const boundaryElement = root.closest<HTMLElement>(".editor-split-pane, .workspace-main-sheet") ?? document.body;
  const [layout, setLayout] = useState({ offset: gap, width: menuWidth, boundaryWidth: submenuWidth,
    side: "right" as "right" | "bottom", submenuSide: "right" as "right" | "bottom" });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const bounds = boundaryElement.getBoundingClientRect();
      const left = Math.max(0, bounds.left) + padding;
      const right = Math.min(window.innerWidth, bounds.right) - padding;
      const triggerRight = triggerRef.current?.getBoundingClientRect().right ?? anchor.left;
      const offset = Math.max(gap, left - triggerRight);
      const width = Math.max(1, right - triggerRight - offset);
      const boundaryWidth = Math.max(1, right - left);
      const side = width >= Math.min(menuWidth, boundaryWidth) ? "right" as const : "bottom" as const;
      const rootWidth = menuRef.current?.getBoundingClientRect().width ?? Math.min(menuWidth, width);
      const next = { offset, width, boundaryWidth, side,
        submenuSide: side === "right" && width - rootWidth >= submenuWidth + gap ? "right" as const : "bottom" as const };
      setLayout(previous => previous.offset === next.offset && previous.width === next.width &&
        previous.boundaryWidth === next.boundaryWidth && previous.side === next.side && previous.submenuSide === next.submenuSide ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(boundaryElement);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [boundaryElement, open, anchor.left, anchor.top, anchor.right, anchor.bottom]);

  const width = layout.side === "right" ? layout.width : layout.boundaryWidth;
  return {
    triggerRef, menuRef, boundaryElement, side: layout.side,
    sideOffset: layout.side === "right" ? layout.offset : gap, submenuSide: layout.submenuSide,
    rootStyle: { minWidth: Math.min(menuWidth, width), maxWidth: width } as CSSProperties,
    submenuStyle: { minWidth: Math.min(menuWidth, layout.boundaryWidth), maxWidth: layout.boundaryWidth } as CSSProperties,
  };
}
