import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { startPointerDrag } from "@/lib/interaction/pointerDrag";
import { editorScaleNow } from "./artifactMeasure";
import type { ArtifactTransformState } from "./useArtifactTransform";
export function useArtifactInteractions({
  viewportRef,
  transformRef,
  isZoomedIn,
  applyTransform,
}: ArtifactTransformState) {
  const gestureRef = useRef<ReturnType<typeof startPointerDrag> | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => gestureRef.current?.dispose(), []);
  useEffect(() => { if (!isZoomedIn) gestureRef.current?.cancel(); }, [isZoomedIn]);
  // 仅在已放大时拦截滚轮：平移查看细节，不缩放，也不抢走页面滚动
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isZoomedIn) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const prev = transformRef.current;
      const zoom = editorScaleNow();
      applyTransform({
        scale: prev.scale,
        x: prev.x - event.deltaX / zoom,
        y: prev.y - event.deltaY / zoom,
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [applyTransform, isZoomedIn, transformRef, viewportRef]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isZoomedIn || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    if ((event.target as HTMLElement | null)?.closest("button")) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = transformRef.current;
    const zoom = editorScaleNow();
    const end = () => { gestureRef.current = null; setDragging(false); };
    setDragging(true);
    gestureRef.current = startPointerDrag({
      target: viewport,
      pointerId: event.pointerId,
      startX,
      startY,
      cursor: "grabbing",
      onMove: (x, y) => applyTransform({
        scale: origin.scale,
        x: origin.x + (x - startX) / zoom,
        y: origin.y + (y - startY) / zoom,
      }),
      onEnd: end,
      onCancel: end,
    });
  };
  return { dragging, onPointerDown };
}
