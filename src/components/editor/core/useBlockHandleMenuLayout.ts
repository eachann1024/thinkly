import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { BLOCK_MENU_GAP, getBlockMenuPlacement, getBlockSubmenuPlacement, getBlockMenuWindowBounds } from "../utils/blockMenuPlacement";
import { createMenuLayoutScheduler } from "../utils/menuLayoutScheduler";

const gap = BLOCK_MENU_GAP;
const menuWidth = 224;
const submenuWidth = 272;

export function useBlockHandleMenuLayout(root: HTMLElement, open: boolean, anchor: DOMRect) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const anchorRef = useRef(anchor);
  const flushLayout = useRef<(() => void) | undefined>(undefined);
  anchorRef.current = anchor;
  const portalContainer = root.ownerDocument.body;
  const boundaryElement = root.ownerDocument.documentElement;
  const [layout, setLayout] = useState({ offset: gap, width: menuWidth, boundaryWidth: submenuWidth,
    rootLeft: 0, rootTop: 0, rootHeight: 0, submenuLeft: 0, submenuTop: 0, submenuHeight: 0,
    side: "left" as "left" | "right", submenuSide: "bottom" as "left" | "right" | "bottom" });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const bounds = getBlockMenuWindowBounds();
      const trigger = triggerRef.current?.getBoundingClientRect() ?? anchorRef.current;
      const menuRect = menuRef.current?.getBoundingClientRect();
      const placement = getBlockMenuPlacement(bounds, trigger, menuWidth, menuRef.current?.scrollHeight);
      const width = placement.width;
      const side = placement.side;
      const offset = gap;
      const rootLeft = placement.left - bounds.left;
      const item = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"][aria-expanded="true"]');
      const itemRect = item?.getBoundingClientRect() ?? menuRect ?? anchorRef.current;
      const submenuPlacement = getBlockSubmenuPlacement(bounds, menuRect ?? trigger, itemRect, submenuWidth);
      const boundaryWidth = submenuPlacement.width;
      const rootHeight = placement.maxHeight;
      const rootTop = placement.top - bounds.top;
      const submenuHeight = submenuPlacement.maxHeight;
      const submenuLeft = submenuPlacement.left - bounds.left;
      const submenuTop = submenuPlacement.top - bounds.top;
      const next = { offset, width, boundaryWidth, side, rootLeft, rootTop, rootHeight, submenuLeft, submenuTop, submenuHeight,
        submenuSide: submenuPlacement.side };
      setLayout(previous => previous.offset === next.offset && previous.width === next.width &&
        previous.rootLeft === next.rootLeft && previous.rootTop === next.rootTop && previous.rootHeight === next.rootHeight && previous.boundaryWidth === next.boundaryWidth && previous.side === next.side && previous.submenuSide === next.submenuSide &&
        previous.submenuLeft === next.submenuLeft && previous.submenuTop === next.submenuTop && previous.submenuHeight === next.submenuHeight ? previous : next);
    };
    const scheduler = createMenuLayoutScheduler(update);
    flushLayout.current = scheduler.flush;
    const observer = new ResizeObserver(scheduler.schedule);
    if (menuRef.current) observer.observe(menuRef.current);
    const mutations = new MutationObserver(scheduler.schedule);
    if (menuRef.current) mutations.observe(menuRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded", "data-entering"] });
    window.addEventListener("resize", scheduler.schedule);
    document.addEventListener("scroll", scheduler.schedule, true);
    return () => { flushLayout.current = undefined; scheduler.cancel(); observer.disconnect(); mutations.disconnect(); window.removeEventListener("resize", scheduler.schedule); document.removeEventListener("scroll", scheduler.schedule, true); };
  }, [root, open]);
  useLayoutEffect(() => {
    if (open) flushLayout.current?.();
  }, [root, open, anchor.left, anchor.top, anchor.right, anchor.bottom]);

  const width = layout.width;
  return {
    triggerRef, menuRef, boundaryElement, portalContainer: portalContainer ?? undefined, side: layout.side,
    sideOffset: layout.offset, submenuSide: layout.submenuSide,
    rootStyle: { "--goose-root-menu-left": `${layout.rootLeft}px`, "--goose-root-menu-top": `${layout.rootTop}px`, "--goose-root-menu-height": `${layout.rootHeight}px`, width, minWidth: width, maxWidth: width } as CSSProperties,
    submenuStyle: { width: layout.boundaryWidth, minWidth: layout.boundaryWidth, maxWidth: layout.boundaryWidth,
        "--goose-submenu-left": `${layout.submenuLeft}px`,
        "--goose-submenu-top": `${layout.submenuTop}px`,
        "--goose-submenu-height": `${layout.submenuHeight}px`,
    } as CSSProperties,
  };
}
