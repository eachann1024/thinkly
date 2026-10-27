import { detectOverflow, offset, shift, size, type Middleware } from "@floating-ui/react";
import type { FloatingUIOptions } from "@blocknote/react";
import { BLOCK_MENU_GAP, BLOCK_MENU_PADDING } from "./blockMenuPlacement";

const MAX_HEIGHT = 384;
const MAX_WIDTH = 280;

const cursorMenuPlacement: Middleware = {
  name: "cursorMenuPlacement",
  async fn(state) {
    const overflow = await detectOverflow(state, {
      elementContext: "reference", boundary: [], padding: BLOCK_MENU_PADDING,
    });
    const above = Math.max(0, -overflow.top - BLOCK_MENU_GAP);
    const below = Math.max(0, -overflow.bottom - BLOCK_MENU_GAP);
    const surface = state.elements.floating.querySelector<HTMLElement>('[data-notion-slash-surface]');
    const scroll = surface?.firstElementChild as HTMLElement | null;
    // Measure the full list: the previous max-height must not keep a clipped
    // menu below the caret after scrolling, resizing, or changing the query.
    const contentHeight = surface && scroll
      ? scroll.scrollHeight + surface.offsetHeight - scroll.clientHeight
      : state.rects.floating.height;
    const desiredHeight = Math.min(MAX_HEIGHT, contentHeight);
    const side = below >= desiredHeight || below >= above ? "bottom" : "top";
    const placement = `${side}-start` as const;
    return {
      data: { maxHeight: Math.max(1, Math.min(MAX_HEIGHT, side === "top" ? above : below)) },
      ...(state.placement !== placement ? { reset: { placement } } : {}),
    };
  },
};

export function getCompactSlashMenuFloatingOptions(): FloatingUIOptions {
  const middleware = [
    cursorMenuPlacement,
    offset(BLOCK_MENU_GAP),
    shift({ boundary: [], padding: BLOCK_MENU_PADDING, crossAxis: false }),
    size({
      boundary: [],
      padding: BLOCK_MENU_PADDING,
      apply({ elements, availableHeight, availableWidth, middlewareData }) {
        const maxHeight = middlewareData.cursorMenuPlacement?.maxHeight ?? MAX_HEIGHT;
        elements.floating.style.maxHeight = `${Math.max(1, Math.min(maxHeight, availableHeight))}px`;
        elements.floating.style.maxWidth = `${Math.max(1, Math.min(MAX_WIDTH, availableWidth))}px`;
        elements.floating.style.overflow = "visible";
      },
    }),
  ];

  return {
    useFloatingOptions: { placement: "bottom-start", strategy: "fixed", middleware },
    elementProps: {
      style: { zIndex: 200, background: "transparent", borderRadius: "var(--goose-menu-radius)" },
      onMouseDownCapture: (event: React.MouseEvent) => event.preventDefault(),
    },
  };
}
