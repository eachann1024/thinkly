import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/useSplitPaneDrag.ts#localMessages:1">`
zh-Hans:
  pane: "分屏"
  edgeTarget: "{{name}}，移到边缘，回车放下"
  swapTarget: "{{name}}，交换位置，回车放下"
  panesRearranged: "分屏位置已更新"
  moveCanceled: "已取消移动"
  movingPane: "正在移动 {{title}}，拖到边缘排列或中央交换，Escape 取消"
  untitled: "未命名"
  swapPositions: "交换位置"
en:
  pane: "Pane"
  edgeTarget: "{{name}}, move to edge. Press Enter to drop."
  swapTarget: "{{name}}, swap positions. Press Enter to drop."
  panesRearranged: "Panes rearranged"
  moveCanceled: "Move canceled"
  movingPane: "Moving {{title}}. Drop at an edge to rearrange or in the center to swap. Escape to cancel."
  untitled: "Untitled"
  swapPositions: "Swap positions"
ja:
  pane: "ペイン"
  edgeTarget: "{{name}}、端へ移動、Enter で確定"
  swapTarget: "{{name}}、位置を入れ替え、Enter で確定"
  panesRearranged: "ペインの位置を更新しました"
  moveCanceled: "移動をキャンセルしました"
  movingPane: "{{title}} を移動中。端にドラッグして並べ替え、中央にドラッグして入れ替え、Escape でキャンセル"
  untitled: "名称未設定"
  swapPositions: "位置を入れ替え"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useRef, useState } from "react";
import { focusSplitPane } from "@/lib/editor-split/commands";
import type { SplitDropPlacement } from "@/lib/editor-split/types";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { useTabs } from "@/stores/useTabs";
import { useOptionalEditorPaneRegistry } from "./editorPaneRegistry";
import { commitPaneMove } from "./commitPaneMove";
import { findPointerTarget, paneElements, targetForPane, type SplitDropTarget } from "./splitDropGeometry";

export type PaneDragPreview = {
  sourceId: string;
  title: string;
  x: number;
  y: number;
  target: SplitDropTarget | null;
};

type DragSession = {
  handle: HTMLButtonElement;
  sourceId: string;
  title: string;
  pointerId: number | null;
  startX: number;
  startY: number;
  active: boolean;
  preview: PaneDragPreview;
};

export function useSplitPaneDrag(tabId: string) {
  useLocale();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const registry = useOptionalEditorPaneRegistry();
  const [preview, setPreview] = useState<PaneDragPreview | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    let session: DragSession | null = null;
    const enabled = () => {
      const store = useEditorSplit.getState();
      const state = store.getStateForTab(tabId);
      return state?.root.kind === "group" && !state.zoomedLeafId && !store.maximizedPaneIdByTab[tabId];
    };
    const finish = (commit: boolean, restoreFocus = true) => {
      const current = session;
      session = null;
      setPreview(null);
      document.body.classList.remove("editor-split-rearranging");
      if (!current) return;
      if (current.pointerId !== null && current.handle.hasPointerCapture(current.pointerId)) {
        current.handle.releasePointerCapture(current.pointerId);
      }
      if (commit && current.active && current.preview.target && enabled()) {
        commitPaneMove(tabId, current.sourceId, current.preview.target, registry, current.pointerId !== null);
        setAnnouncement(uiText("panesRearranged"));
      } else if (current.active) setAnnouncement(uiText("moveCanceled"));
      if (current.pointerId === null && restoreFocus) {
        requestAnimationFrame(() => {
          const handle = Array.from(surface.querySelectorAll<HTMLButtonElement>("[data-split-drag-handle]"))
            .find((item) => item.dataset.splitDragHandle === current.sourceId);
          handle?.focus({ preventScroll: true });
        });
      }
    };
    const activate = (current: DragSession) => {
      current.active = true;
      focusSplitPane(tabId, current.sourceId, { focusEditor: false });
      document.body.classList.add("editor-split-rearranging");
      setAnnouncement(uiText("movingPane", {title: current.title}));
    };
    const getHandle = (target: EventTarget | null) => target instanceof Element
      ? target.closest<HTMLButtonElement>("[data-split-drag-handle]") : null;
    const createSession = (handle: HTMLButtonElement, pointerId: number | null, x: number, y: number): DragSession => ({
      handle, sourceId: handle.dataset.splitDragHandle!,
      title: handle.closest("[data-split-chrome]")?.querySelector(".editor-split-header-title")?.textContent ?? uiText("untitled"),
      pointerId, startX: x, startY: y, active: false,
      preview: { sourceId: handle.dataset.splitDragHandle!, title: "", x: 0, y: 0, target: null },
    });
    const onPointerDown = (event: PointerEvent) => {
      const handle = getHandle(event.target);
      if (!handle || !enabled() || event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
      session = createSession(handle, event.pointerId, event.clientX, event.clientY);
      handle.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const current = session;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5) return;
      event.preventDefault();
      if (!current.active) activate(current);
      const rect = surface.getBoundingClientRect();
      current.preview = {
        sourceId: current.sourceId, title: current.title,
        x: Math.max(12, Math.min(event.clientX - rect.left + 16, rect.width - 180)),
        y: Math.max(12, Math.min(event.clientY - rect.top + 18, rect.height - 44)),
        target: findPointerTarget(surface, current.sourceId, event.clientX, event.clientY),
      };
      setPreview(current.preview);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (session?.pointerId !== event.pointerId) return;
      if (session.active) onPointerMove(event);
      finish(true);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (session?.pointerId === event.pointerId) finish(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session) {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
        return;
      }
      if (!getHandle(event.target) || !enabled()) return;
      if (!session && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        event.stopPropagation();
        const handle = getHandle(event.target)!;
        session = createSession(handle, null, 0, 0);
        activate(session);
        session.preview = { ...session.preview, title: session.title, x: 12, y: 44 };
        setPreview(session.preview);
        return;
      }
      if (!session || session.pointerId !== null) return;
      if (event.key === "Tab") { finish(false, false); return; }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
        return;
      }
      const direction: Record<string, SplitDropPlacement> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom",
      };
      const placement = direction[event.key];
      if (!placement) return;
      event.preventDefault();
      event.stopPropagation();
      const panes = paneElements(surface).filter((pane) => pane.dataset.paneId !== session?.sourceId);
      const target = session.preview.target;
      let pane = panes.find((item) => item.dataset.paneId === target?.paneId);
      if (!event.shiftKey || !pane) {
        const index = pane ? panes.indexOf(pane) : -1;
        const step = placement === "left" || placement === "top" ? -1 : 1;
        pane = panes[(index + step + panes.length) % panes.length];
      }
      if (!pane) return;
      session.preview = { ...session.preview, target: targetForPane(surface, pane, event.shiftKey ? placement : "center") };
      setPreview(session.preview);
      setAnnouncement(uiText(event.shiftKey ? "edgeTarget" : "swapTarget", {name: pane.querySelector(".editor-split-header-title")?.textContent ?? uiText("pane")}));
    };
    const cancel = () => finish(false, false);
    const onClick = (event: MouseEvent) => {
      if (getHandle(event.target)) { event.preventDefault(); event.stopPropagation(); }
    };
    surface.addEventListener("pointerdown", onPointerDown, true);
    surface.addEventListener("click", onClick, true);
    surface.addEventListener("lostpointercapture", onPointerCancel, true);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    const unsubscribeTabs = useTabs.subscribe((next, previous) => {
      if (next.activeTabId !== previous.activeTabId) cancel();
    });
    const unsubscribeSplit = useEditorSplit.subscribe((next, previous) => {
      if (session && (next.byTabId[tabId]?.root !== previous.byTabId[tabId]?.root || next.byTabId[tabId]?.zoomedLeafId || next.maximizedPaneIdByTab[tabId] !== previous.maximizedPaneIdByTab[tabId])) cancel();
    });
    return () => {
      finish(false, false);
      surface.removeEventListener("pointerdown", onPointerDown, true);
      surface.removeEventListener("click", onClick, true);
      surface.removeEventListener("lostpointercapture", onPointerCancel, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      unsubscribeTabs();
      unsubscribeSplit();
    };
  }, [tabId, registry]);

  return { surfaceRef, preview, announcement };
}
