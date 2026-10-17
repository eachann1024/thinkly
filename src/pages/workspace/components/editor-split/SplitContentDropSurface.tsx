import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitContentDropSurface.tsx#localMessages:1">`
zh-Hans:
  splitToTheLeft: "在左侧分屏"
  splitToTheRight: "在右侧分屏"
  splitAbove: "在上方分屏"
  splitBelow: "在下方分屏"
  couldnTOpenTheDroppedContentTry: "无法打开拖入内容，请重试"
  youCanOpenUpToPanes: "最多只能分成 4 格"
en:
  splitToTheLeft: "Split to the left"
  splitToTheRight: "Split to the right"
  splitAbove: "Split above"
  splitBelow: "Split below"
  couldnTOpenTheDroppedContentTry: "Couldn’t open the dropped content. Try again."
  youCanOpenUpToPanes: "You can open up to 4 panes"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/sonner";
import { GOOSE_FOLDER_MIME, GOOSE_PAGE_MIME, GOOSE_TEXT_MIME, hasWorkspaceDrag, readWorkspaceDrag } from "@/lib/workspace-drag";
import { dropWorkspaceContent, type SplitContentPlacement } from "@/lib/editor-split/drop";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { countLeaves, MAX_SPLIT_LEAVES } from "@/lib/editor-split/tree";
import "./split-content-drop.css";

type SplitDropTarget = {
  paneId: string; placement: SplitContentPlacement;
  left: number; top: number; width: number; height: number;
};

const labels: Record<SplitContentPlacement, string> = {
  left: uiText("splitToTheLeft"), right: uiText("splitToTheRight"), top: uiText("splitAbove"), bottom: uiText("splitBelow"),
};

function isFileDrag(data: DataTransfer): boolean {
  return Array.from(data.types).some((type) => type === GOOSE_PAGE_MIME || type === GOOSE_FOLDER_MIME);
}

function isEditorDrag(data: DataTransfer): boolean {
  return Array.from(data.types).some((type) => type === "blocknote/html" || type === GOOSE_TEXT_MIME);
}

function contentDropTarget(surface: HTMLElement, x: number, y: number): SplitDropTarget | null {
  for (const pane of surface.querySelectorAll<HTMLElement>(".editor-split-pane[data-pane-id]")) {
    const rect = pane.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    const horizontalZone = rect.width * 0.3;
    const verticalZone = Math.min(90, Math.max(28, rect.height * 0.22));
    const edges: [SplitContentPlacement, number, number][] = [
      ["left", x - rect.left, horizontalZone], ["right", rect.right - x, horizontalZone],
      ["top", y - rect.top, verticalZone], ["bottom", rect.bottom - y, verticalZone],
    ];
    // 左右各覆盖 30%，分别判断热区后再选择最近边缘。
    const candidates = edges.filter((edge) => edge[1] <= edge[2]);
    if (!candidates.length) return null;
    const nearest = candidates.reduce((best, edge) => edge[1] < best[1] ? edge : best);
    const placement = nearest[0];
    const origin = surface.getBoundingClientRect();
    const width = placement === "left" || placement === "right" ? rect.width / 2 : rect.width;
    const height = placement === "top" || placement === "bottom" ? rect.height / 2 : rect.height;
    return {
      paneId: pane.dataset.paneId!, placement,
      left: rect.left - origin.left + (placement === "right" ? width : 0) + 5,
      top: rect.top - origin.top + (placement === "bottom" ? height : 0) + 5,
      width: Math.max(0, width - 10), height: Math.max(0, height - 10),
    };
  }
  return null;
}

/** 文件只允许落在分屏边缘；正文选区仍保留原有的文内拖动行为。 */
export function SplitContentDropSurface({ tabId, children }: { tabId: string; children: ReactNode }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<SplitDropTarget | null>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const reset = () => setPreview(null);
    const over = (event: DragEvent) => {
      const data = event.dataTransfer;
      if (!data || !(event.target instanceof Node) || !surface.contains(event.target)) return;
      if (isEditorDrag(data)) { reset(); return; }
      const canSplit = hasWorkspaceDrag(data);
      if (!canSplit && !isFileDrag(data)) return;
      const target = canSplit ? contentDropTarget(surface, event.clientX, event.clientY) : null;
      if (!target && !isFileDrag(data)) { reset(); return; }
      event.preventDefault();
      event.stopPropagation();
      // 只拒绝当前位置的落下，保留原生拖拽，继续移到边缘即可分屏。
      data.dropEffect = target ? "copy" : "none";
      if (!target) { reset(); return; }
      const state = useEditorSplit.getState().getStateForTab(tabId);
      setFull(Boolean(state && countLeaves(state.root) >= MAX_SPLIT_LEAVES));
      setPreview((old) => old?.paneId === target.paneId && old.placement === target.placement &&
        old.left === target.left && old.top === target.top && old.width === target.width &&
        old.height === target.height ? old : target);
    };
    const drop = (event: DragEvent) => {
      reset();
      if (!(event.target instanceof Node) || !surface.contains(event.target)) return;
      const data = event.dataTransfer;
      if (!data || isEditorDrag(data)) return;
      const canSplit = hasWorkspaceDrag(data);
      if (!canSplit && !isFileDrag(data)) return;
      const target = canSplit ? contentDropTarget(surface, event.clientX, event.clientY) : null;
      if (!target && !isFileDrag(data)) return;
      // BlockNote also moves/deletes selections from document capture, so consume
      // edge drops at window capture before either editor can handle this copy.
      event.preventDefault();
      event.stopPropagation();
      data.dropEffect = target ? "copy" : "none";
      if (!target) return;
      const payload = readWorkspaceDrag(data);
      if (!payload) return;
      void dropWorkspaceContent(tabId, target.paneId, target.placement as SplitContentPlacement, payload)
        .catch(() => toast.error(uiText("couldnTOpenTheDroppedContentTry")));
    };
    const leave = (event: DragEvent) => {
      if (!(event.relatedTarget instanceof Node) || !surface.contains(event.relatedTarget)) reset();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") reset(); };
    window.addEventListener("dragover", over, true);
    window.addEventListener("drop", drop, true);
    surface.addEventListener("dragleave", leave);
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("dragover", over, true);
      window.removeEventListener("drop", drop, true);
      surface.removeEventListener("dragleave", leave);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      window.removeEventListener("keydown", escape);
    };
  }, [tabId]);
  return (
    <div ref={surfaceRef} className="relative h-full min-h-0" data-split-content-drop="">
      {children}
      {preview ? (
        <div className="split-content-drop-layer" aria-hidden="true">
          <div className="split-content-drop-preview" data-placement={preview.placement}
            style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}>
            <span className="split-content-drop-label">{full ? uiText("youCanOpenUpToPanes") : labels[preview.placement]}</span>
          </div>
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {preview ? full ? uiText("youCanOpenUpToPanes") : labels[preview.placement as SplitContentPlacement] : ""}
      </span>
    </div>
  );
}
