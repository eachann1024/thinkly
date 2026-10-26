import { flip, offset, shift, size, type Middleware } from "@floating-ui/react";
import type { FloatingUIOptions } from "@blocknote/react";
import { getBlockMenuPlacement, getBlockMenuWindowBounds } from "./blockMenuPlacement";

export function getCompactSlashMenuFloatingOptions(editorRoot?: HTMLElement): FloatingUIOptions {
  const addButton = () => {
    const pane = editorRoot?.closest(".editor-split-pane, .workspace-main-sheet") ?? editorRoot?.parentElement;
    return pane?.querySelector<HTMLElement>('.goose-empty-block-add[aria-expanded="true"]');
  };
  const cursorMiddleware = [
    offset(6),
    flip({ fallbackPlacements: ["top-start"], padding: 24 }),
    shift({ padding: 24 }),
    size({
      padding: 24,
      apply({ elements, availableHeight, availableWidth }) {
        elements.floating.style.maxHeight = `${Math.max(1, Math.min(384, availableHeight))}px`;
        elements.floating.style.maxWidth = `${Math.max(1, Math.min(280, availableWidth))}px`;
        elements.floating.style.overflow = "visible";
      },
    }),
  ];
  const middleware: Middleware[] = [...cursorMiddleware.map((middleware) => ({
    ...middleware,
    fn: (state: Parameters<Middleware["fn"]>[0]) => addButton() ? {} : middleware.fn(state),
  })), {
    name: "blockMenuAnchor",
    fn({ elements, rects, placement, x, y }) {
      const button = addButton();
      if (!button) return {};
      const reference = elements.reference.getBoundingClientRect();
      const bounds = getBlockMenuWindowBounds();
      const trigger = button.getBoundingClientRect();
      const surface = elements.floating.querySelector<HTMLElement>('[data-notion-slash-surface]');
      const target = getBlockMenuPlacement(bounds, trigger, 280, surface?.scrollHeight);
      const nextPlacement = `${target.side}-start` as const;
      if (placement !== nextPlacement) return { reset: { placement: nextPlacement } };
      elements.floating.style.maxHeight = `${target.maxHeight}px`;
      elements.floating.style.maxWidth = `${target.width}px`;
      elements.floating.style.overflow = "visible";
      const initialX = target.side === "left" ? reference.left - rects.floating.width : reference.right;
      return { x: x + target.left - initialX, y: y + target.top - reference.top };
    },
  }];

  return {
    useFloatingOptions: { placement: "bottom-start", strategy: "fixed", middleware },
    elementProps: {
      style: { zIndex: 200, background: "transparent", borderRadius: "var(--goose-menu-radius)" },
      onMouseDownCapture: (event: React.MouseEvent) => event.preventDefault(),
    },
  };
}
