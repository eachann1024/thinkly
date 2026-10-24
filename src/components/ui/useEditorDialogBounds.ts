import { useLayoutEffect, useState, type CSSProperties } from "react";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";

export function useEditorDialogBounds(open: boolean): CSSProperties | undefined {
  const compact = useWorkspaceViewport((state) => state.forceCollapseLeft);
  const [bounds, setBounds] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open || !compact) {
      setBounds(undefined);
      return;
    }
    const sheet = document.querySelector<HTMLElement>(".workspace-main-sheet");
    if (!sheet) return;
    const update = () => {
      const rect = sheet.getBoundingClientRect();
      setBounds({
        "--editor-dialog-left": `${rect.left}px`,
        "--editor-dialog-top": `${rect.top}px`,
        "--editor-dialog-width": `${rect.width}px`,
        "--editor-dialog-height": `${rect.height}px`,
        "--editor-dialog-radius": getComputedStyle(sheet).borderRadius,
      } as CSSProperties);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(sheet);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open, compact]);

  return open && compact ? bounds : undefined;
}
