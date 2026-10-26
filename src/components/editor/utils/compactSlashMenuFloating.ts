import { type Middleware } from "@floating-ui/react";
import type { FloatingUIOptions } from "@blocknote/react";
import { getBlockMenuPlacement, getBlockMenuWindowBounds } from "./blockMenuPlacement";

export function getCompactSlashMenuFloatingOptions(editorRoot?: HTMLElement): FloatingUIOptions {
  const middleware: Middleware[] = [{
    name: "blockMenuAnchor",
    fn({ elements, rects, placement, x, y }) {
      const reference = elements.reference.getBoundingClientRect();
      const bounds = getBlockMenuWindowBounds();
      const content = editorRoot?.querySelector(".bn-block-group")?.getBoundingClientRect();
      const pane = editorRoot?.closest(".editor-split-pane, .workspace-main-sheet") ?? editorRoot?.parentElement;
      const button = pane?.querySelector<HTMLElement>('.goose-empty-block-add[aria-expanded="true"]');
      const trigger = button?.getBoundingClientRect() ?? {
        left: Math.max(bounds.left + 4, (content?.left ?? reference.left) - 56),
        right: Math.max(bounds.left + 48, (content?.left ?? reference.left) - 12),
        top: reference.top, bottom: reference.bottom,
      };
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
    useFloatingOptions: { placement: "left-start", strategy: "fixed", middleware },
    elementProps: {
      style: { zIndex: 200, background: "transparent", borderRadius: "var(--goose-menu-radius)" },
      onMouseDownCapture: (event: React.MouseEvent) => event.preventDefault(),
    },
  };
}
