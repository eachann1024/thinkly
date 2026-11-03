import { useCallback, useEffect, useRef, useState } from "react";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import {
  centerOffset,
  fitPercent,
  measureContent,
  panOffset,
  stepPercent,
  type PreviewStage,
} from "./previewStage";

const START: PreviewStage = { percent: 100, x: 0, y: 0, fitted: true };

export function usePreviewStage(contentKey: string, pannable: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<PreviewStage>(START);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const readSizes = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return null;
    const measured = measureContent(content);
    if (!measured) return null;
    return {
      viewport: { width: viewport.clientWidth, height: viewport.clientHeight },
      content: measured,
    };
  }, []);

  const fit = useCallback(() => {
    const sizes = readSizes();
    if (!sizes) return false;
    const percent = fitPercent(sizes.viewport, sizes.content);
    const offset = centerOffset(sizes.viewport, sizes.content, percent);
    setStage({ percent, ...offset, fitted: true });
    return true;
  }, [readSizes]);

  useEffect(() => {
    setStage(START);
    let frame = 0;
    let attempts = 0;
    const measure = () => {
      if (fit()) return;
      if (attempts++ < 30) frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    const viewport = viewportRef.current;
    const observer = viewport && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (stageRef.current.fitted) fit();
        })
      : null;
    if (viewport) observer?.observe(viewport);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [contentKey, fit]);

  const zoomBy = useCallback((direction: 1 | -1) => {
    const sizes = readSizes();
    setStage((current) => {
      const percent = stepPercent(current.percent, direction);
      if (!sizes) return { ...current, percent, fitted: false };
      return { percent, ...centerOffset(sizes.viewport, sizes.content, percent), fitted: false };
    });
  }, [readSizes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlatformPrimaryModifierEvent(event) || event.altKey) return;
      if (event.key === "=" || event.key === "+" || event.code === "Equal" || event.code === "NumpadAdd") {
        event.preventDefault();
        zoomBy(1);
      } else if (event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract") {
        event.preventDefault();
        zoomBy(-1);
      } else if (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0") {
        event.preventDefault();
        fit();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [fit, zoomBy]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!pannable || event.button !== 0) return;
    if ((event.target as HTMLElement | null)?.closest("button, a, input, iframe")) return;
    const start = { x: event.clientX, y: event.clientY, ...stageRef.current };
    const move = (next: PointerEvent) => {
      const sizes = readSizes();
      if (!sizes) return;
      const offset = panOffset(
        start,
        { x: next.clientX - start.x, y: next.clientY - start.y },
        sizes.viewport,
        sizes.content,
        start.percent,
      );
      setStage((current) => ({ ...current, ...offset }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }, [pannable, readSizes]);

  return { viewportRef, contentRef, stage, zoomBy, fit, onPointerDown };
}
