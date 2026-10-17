import { useLocale } from "@/i18n";
import type { ReactNode } from "react";
import { useSplitPaneDrag } from "./useSplitPaneDrag";
import { splitDropLabels } from "./splitDropGeometry";

export function SplitPaneDragSurface({ tabId, children }: { tabId: string; children: ReactNode }) {
  useLocale();
  const { surfaceRef, preview, announcement } = useSplitPaneDrag(tabId);
  return (
    <div
      ref={surfaceRef}
      className="editor-split-surface"
      data-editor-split="true"
      data-pane-dragging={preview?.sourceId}
    >
      {children}
      {preview ? (
        <div className="editor-split-drag-layer" aria-hidden="true">
          {preview.target ? (
            <div
              className="editor-split-drop-preview"
              data-placement={preview.target.placement}
              style={{ left: preview.target.left, top: preview.target.top, width: preview.target.width, height: preview.target.height }}
            >
              <span className="editor-split-drop-label">{splitDropLabels[preview.target.placement]}</span>
            </div>
          ) : null}
          <div className="editor-split-drag-ghost" style={{ left: preview.x, top: preview.y }}>
            <span className="editor-split-ghost-grip" />
            <span>{preview.title}</span>
          </div>
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </div>
  );
}
