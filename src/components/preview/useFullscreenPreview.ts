import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "@/components/ui/icons";
import { clampPreviewZoomPercent, PREVIEW_ZOOM_STEP_PERCENT, toImageDataUrl, type PreviewContent } from "@/lib/preview/previewAction";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";

function isZoomInKey(event: KeyboardEvent) {
  return (
    event.key === "=" ||
    event.key === "+" ||
    event.code === "Equal" ||
    event.code === "NumpadAdd"
  );
}

function isZoomOutKey(event: KeyboardEvent) {
  return event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract";
}

function isZoomResetKey(event: KeyboardEvent) {
  return event.key === "0" || event.code === "Digit0" || event.code === "Numpad0";
}

function measureVectorSize(node: HTMLElement): { width: number; height: number } {
  const svg = node.querySelector(".goose-preview-svg > svg");
  const viewBox = (svg as SVGSVGElement | null)?.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  return { width: node.offsetWidth, height: node.offsetHeight };
}

export function useFullscreenPreview(open: boolean, content: PreviewContent | null, onClose: () => void) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [vectorFit, setVectorFit] = useState<{
    width: number;
    height: number;
    scale: number;
  } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setZoomPercent(100);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlatformPrimaryModifierEvent(event) || event.altKey) return;
      if (isZoomInKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        setZoomPercent((current) =>
          clampPreviewZoomPercent(current + PREVIEW_ZOOM_STEP_PERCENT),
        );
        return;
      }
      if (isZoomOutKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        setZoomPercent((current) =>
          clampPreviewZoomPercent(current - PREVIEW_ZOOM_STEP_PERCENT),
        );
        return;
      }
      if (isZoomResetKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        setZoomPercent(100);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || content?.kind !== "image") {
      setImageSrc(null);
      return;
    }
    let cancelled = false;
    void toImageDataUrl(content.data).then((src) => {
      if (!cancelled) setImageSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [content, open]);

  const isVector = content?.kind === "svg" || content?.kind === "math";
  const vectorKey =
    content?.kind === "svg"
      ? content.markup
      : content?.kind === "math"
        ? content.source
        : "";

  useLayoutEffect(() => {
    if (!open || !isVector) {
      setVectorFit(null);
      return;
    }
    let frame = 0;
    let attempts = 0;
    const measure = () => {
      const body = bodyRef.current;
      const node = vectorRef.current;
      if (!body || !node) return;
      const size = measureVectorSize(node);
      const style = getComputedStyle(body);
      const availableWidth =
        body.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      const availableHeight =
        body.clientHeight -
        Number.parseFloat(style.paddingTop) -
        Number.parseFloat(style.paddingBottom);
      if (size.width < 8 || size.height < 8) {
        if (attempts++ < 20) frame = window.requestAnimationFrame(measure);
        return;
      }
      setVectorFit({
        width: size.width,
        height: size.height,
        scale: Math.min(
          1,
          availableWidth / size.width,
          availableHeight / size.height,
        ),
      });
    };
    measure();
    return () => window.cancelAnimationFrame(frame);
  }, [open, isVector, vectorKey]);

  const bodyClass = useMemo(() => {
    if (!content) return "";
    if (content.kind === "image") return "is-media";
    if (content.kind === "html") return "is-html";
    if (content.kind === "math") return "is-vector is-math";
    return "is-vector";
  }, [content]);

  return { imageSrc, zoomPercent, setZoomPercent, vectorFit, bodyRef, vectorRef, isVector, bodyClass };
}
