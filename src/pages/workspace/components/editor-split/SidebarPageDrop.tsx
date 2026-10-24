import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SidebarPageDrop.tsx#localMessages:1">`
zh-Hans:
  splitToTheLeft: "在左侧分屏"
  splitToTheRight: "在右侧分屏"
  splitAbove: "在上方分屏"
  splitBelow: "在下方分屏"
  replaceThisNote: "替换此笔记"
en:
  splitToTheLeft: "Split to the left"
  splitToTheRight: "Split to the right"
  splitAbove: "Split above"
  splitBelow: "Split below"
  replaceThisNote: "Replace this note"
ja:
  splitToTheLeft: "左に分割"
  splitToTheRight: "右に分割"
  splitAbove: "上に分割"
  splitBelow: "下に分割"
  replaceThisNote: "このノートに置き換え"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useState, type RefObject } from "react";
import { readWorkspaceDrag } from "@/lib/workspace-drag";
import {
  isSidebarPageDrag,
  resolveSidebarPageDrop,
  type SidebarDropRect,
} from "@/lib/editor-split/sidebarPageDrop";
import { countLeaves } from "@/lib/editor-split/tree";
import type { SplitDropPlacement } from "@/lib/editor-split/types";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { commitSidebarPageDrop } from "./commitSidebarPageDrop";
import { targetForPane, type SplitDropTarget } from "./splitDropGeometry";

const labels: Record<SplitDropPlacement, string> = {
  get left() { return uiText("splitToTheLeft"); },
  get right() { return uiText("splitToTheRight"); },
  get top() { return uiText("splitAbove"); },
  get bottom() { return uiText("splitBelow"); },
  get center() { return uiText("replaceThisNote"); },
};

function paneRect(pane: HTMLElement): SidebarDropRect {
  const rect = pane.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function paneAt(surface: HTMLElement, x: number, y: number): HTMLElement | null {
  for (const pane of surface.querySelectorAll<HTMLElement>(".editor-split-pane[data-pane-id]")) {
    const rect = pane.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    return pane;
  }
  return null;
}

function sameTarget(a: SplitDropTarget | null, b: SplitDropTarget | null): boolean {
  return !!a && !!b && a.paneId === b.paneId && a.placement === b.placement &&
    a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

export function SidebarPageDrop({
  tabId,
  surfaceRef,
}: {
  tabId: string;
  surfaceRef: RefObject<HTMLDivElement | null>;
}) {
  useLocale();
  const [preview, setPreview] = useState<SplitDropTarget | null>(null);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const reset = () => setPreview(null);
    const placementAt = (x: number, y: number) => {
      const pane = paneAt(surface, x, y);
      if (!pane?.dataset.paneId) return null;
      const state = useEditorSplit.getState().getStateForTab(tabId);
      const placement = resolveSidebarPageDrop({
        rect: paneRect(pane),
        x,
        y,
        leafCount: state ? countLeaves(state.root) : 0,
      });
      return placement ? targetForPane(surface, pane, placement) : null;
    };
    const over = (event: DragEvent) => {
      const data = event.dataTransfer;
      if (!data || !isSidebarPageDrag(Array.from(data.types))) return;
      if (!(event.target instanceof Node) || !surface.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = placementAt(event.clientX, event.clientY);
      data.dropEffect = target ? "copy" : "none";
      setPreview((old) => (sameTarget(old, target) ? old : target));
    };
    const drop = (event: DragEvent) => {
      const data = event.dataTransfer;
      if (!data || !isSidebarPageDrag(Array.from(data.types))) return;
      if (!(event.target instanceof Node) || !surface.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = placementAt(event.clientX, event.clientY);
      data.dropEffect = target ? "copy" : "none";
      reset();
      if (!target) return;
      const payload = readWorkspaceDrag(data);
      if (!payload || payload.kind !== "page") return;
      commitSidebarPageDrop(tabId, target.paneId, target.placement, payload.pageId);
    };
    const leave = (event: DragEvent) => {
      if (!(event.relatedTarget instanceof Node) || !surface.contains(event.relatedTarget)) reset();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") reset(); };
    window.addEventListener("dragover", over, true);
    window.addEventListener("drop", drop, true);
    surface.addEventListener("dragleave", leave);
    window.addEventListener("dragend", reset);
    window.addEventListener("keydown", escape);
    return () => {
      reset();
      window.removeEventListener("dragover", over, true);
      window.removeEventListener("drop", drop, true);
      surface.removeEventListener("dragleave", leave);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("keydown", escape);
    };
  }, [tabId, surfaceRef]);
  return (
    <>
      {preview ? (
        <div className="editor-split-drag-layer" aria-hidden="true">
          <div
            className="editor-split-drop-preview"
            data-placement={preview.placement}
            style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}
          >
            <span className="editor-split-drop-label">{labels[preview.placement]}</span>
          </div>
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {preview ? labels[preview.placement] : ""}
      </span>
    </>
  );
}
