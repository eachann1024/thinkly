import { clampPreviewZoomPercent, PREVIEW_ZOOM_STEP_PERCENT } from "@/lib/preview/previewAction";

const MIN_PERCENT = 25;
const MAX_PERCENT = 400;

export type PreviewStage = {
  percent: number;
  x: number;
  y: number;
  fitted: boolean;
};

export function fitPercent(viewport: { width: number; height: number }, content: { width: number; height: number }): number {
  if (viewport.width <= 0 || viewport.height <= 0 || content.width < 8 || content.height < 8) return 100;
  const scale = Math.min(1, (viewport.width - 32) / content.width, (viewport.height - 32) / content.height);
  return clampPercent(Math.round(scale * 100));
}

export function clampPercent(value: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, clampPreviewZoomPercent(value)));
}

export function stepPercent(current: number, direction: 1 | -1): number {
  return clampPercent(current + direction * PREVIEW_ZOOM_STEP_PERCENT);
}

export function centerOffset(
  viewport: { width: number; height: number },
  content: { width: number; height: number },
  percent: number,
): { x: number; y: number } {
  const scale = percent / 100;
  return {
    x: Math.round((viewport.width - content.width * scale) / 2),
    y: Math.round((viewport.height - content.height * scale) / 2),
  };
}

export function panOffset(
  current: { x: number; y: number },
  delta: { x: number; y: number },
  viewport: { width: number; height: number },
  content: { width: number; height: number },
  percent: number,
): { x: number; y: number } {
  const scaled = { width: content.width * (percent / 100), height: content.height * (percent / 100) };
  return {
    x: clampAxis(current.x + delta.x, viewport.width, scaled.width),
    y: clampAxis(current.y + delta.y, viewport.height, scaled.height),
  };
}

function clampAxis(value: number, viewport: number, scaled: number): number {
  if (scaled <= viewport) return Math.round((viewport - scaled) / 2);
  return Math.round(Math.min(0, Math.max(viewport - scaled, value)));
}

export function measureContent(node: HTMLElement): { width: number; height: number } | null {
  const svg = node.querySelector("svg");
  if (svg instanceof SVGSVGElement) {
    const box = svg.viewBox?.baseVal;
    if (box && box.width > 8 && box.height > 8) return { width: box.width, height: box.height };
  }
  const width = Math.max(node.scrollWidth, node.offsetWidth);
  const height = Math.max(node.scrollHeight, node.offsetHeight);
  return width >= 8 && height >= 8 ? { width, height } : null;
}
