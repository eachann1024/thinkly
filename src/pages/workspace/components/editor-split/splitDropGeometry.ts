import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/splitDropGeometry.ts#localMessages:1">`
zh-Hans:
  moveLeft: "移到左侧"
  moveRight: "移到右侧"
  moveAbove: "移到上方"
  moveBelow: "移到下方"
  swapPositions: "交换位置"
en:
  moveLeft: "Move left"
  moveRight: "Move right"
  moveAbove: "Move above"
  moveBelow: "Move below"
  swapPositions: "Swap positions"
`;
const uiText = createTranslator(localMessages);
import type { SplitDropPlacement } from "@/lib/editor-split/types";

export type SplitDropTarget = {
  paneId: string;
  placement: SplitDropPlacement;
  left: number;
  top: number;
  width: number;
  height: number;
};

export const splitDropLabels: Record<SplitDropPlacement, string> = {
  get left() { return uiText("moveLeft"); }, get right() { return uiText("moveRight"); }, get top() { return uiText("moveAbove"); },
  get bottom() { return uiText("moveBelow"); }, get center() { return uiText("swapPositions"); },
};

export function paneElements(surface: HTMLElement): HTMLElement[] {
  return Array.from(surface.querySelectorAll<HTMLElement>(".editor-split-pane[data-pane-id]"));
}

export function targetForPane(
  surface: HTMLElement,
  pane: HTMLElement,
  placement: SplitDropPlacement,
): SplitDropTarget {
  const rect = pane.getBoundingClientRect();
  const origin = surface.getBoundingClientRect();
  const horizontal = placement === "left" || placement === "right";
  const vertical = placement === "top" || placement === "bottom";
  const width = horizontal ? rect.width / 2 : rect.width;
  const height = vertical ? rect.height / 2 : rect.height;
  return {
    paneId: pane.dataset.paneId!, placement,
    left: rect.left - origin.left + (placement === "right" ? width : 0) + 5,
    top: rect.top - origin.top + (placement === "bottom" ? height : 0) + 5,
    width: Math.max(0, width - 10), height: Math.max(0, height - 10),
  };
}

export function findPointerTarget(
  surface: HTMLElement,
  sourceId: string,
  x: number,
  y: number,
): SplitDropTarget | null {
  for (const pane of paneElements(surface)) {
    const rect = pane.getBoundingClientRect();
    if (pane.dataset.paneId === sourceId || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    const edges: [SplitDropPlacement, number][] = [
      ["left", (x - rect.left) / rect.width],
      ["right", (rect.right - x) / rect.width],
      ["top", (y - rect.top) / rect.height],
      ["bottom", (rect.bottom - y) / rect.height],
    ];
    const nearest = edges.reduce((best, edge) => edge[1] < best[1] ? edge : best);
    return targetForPane(surface, pane, nearest[1] < 0.28 ? nearest[0] : "center");
  }
  return null;
}
