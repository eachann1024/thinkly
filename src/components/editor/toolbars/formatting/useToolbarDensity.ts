import { useLayoutEffect, useState, type RefObject } from "react";
import type { snapshotCurrentSelection } from "./selectionRestore";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";

export type ToolbarDensity = "full" | "compact" | "narrow" | "minimal";

export function useToolbarDensity(
  editor: Parameters<typeof snapshotCurrentSelection>[0],
  menuRef: RefObject<HTMLDivElement | null>,
  isQuickNoteSurface: boolean,
) {
  const [density, setDensity] = useState<ToolbarDensity>("minimal");
  useLayoutEffect(() => {
    const surface =
      editor.domElement?.closest(".workspace-editor-surface") ??
      editor.domElement;
    if (!surface) return;
    const update = () => {
      const menu = menuRef.current;
      const scale =
        isQuickNoteSurface || !menu
          ? 1
          : Number.parseFloat(
              getComputedStyle(menu).getPropertyValue("--editor-ui-scale"),
            ) || 1;
      const maxWidth = menu ? getComputedStyle(menu).maxWidth : "none";
      const floatingLimit = maxWidth.endsWith("px") ? Number.parseFloat(maxWidth) : Infinity;
      const width = Math.min(
        surface.getBoundingClientRect().width - 24,
        window.innerWidth - 24,
        floatingLimit,
      );
      const available = width / scale;
      setDensity(
        available >= 860
          ? "full"
          : available >= 620
            ? "compact"
            : available >= 440
              ? "narrow"
              : "minimal",
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener("resize", update);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, update);
    };
  }, [editor, menuRef, isQuickNoteSurface]);
  return density;
}
