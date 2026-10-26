import { useLayoutEffect, useState } from "react";
import { useEditorDOMElement } from "@blocknote/react";

const layers = new WeakMap<HTMLElement, { element: HTMLDivElement; users: number }>();

// One clipped, non-scrolling overlay host per editor pane. Fixed descendants
// use this host as their containing block, never the application viewport.
export function useEditorOverlayLayer() {
  const root = useEditorDOMElement();
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!root) return;
    const boundary = root.closest<HTMLElement>(".editor-split-pane, .workspace-main-sheet")
      ?? root.closest<HTMLElement>(".page-scroll-container")?.parentElement
      ?? root.closest<HTMLElement>("main.workspace-editor-surface")
      ?? root.closest<HTMLElement>(".workspace-editor-surface")
      ?? root.parentElement!;
    let entry = layers.get(boundary);
    if (!entry) {
      const element = document.createElement("div");
      element.className = "goose-editor-overlay-layer";
      boundary.append(element);
      entry = { element, users: 0 };
      layers.set(boundary, entry);
    }
    entry.users++;
    setLayer(entry.element);
    return () => {
      if (--entry.users === 0) { entry.element.remove(); layers.delete(boundary); }
    };
  }, [root]);
  return layer;
}
