import { useEffect, useState, type RefObject } from "react";
import { normalizeSvgIntrinsicSize, wrapHtmlDocument } from "@/lib/preview/previewAction";
import { renderMathPreview } from "@/components/editor/blocks/math/mathPreviewCache";
import type { FullscreenPreviewPayload } from "@/lib/preview/fullscreenPreviewWindow";
import { PreviewChart } from "./PreviewChart";
import type { PreviewStage } from "./previewStage";

export function PreviewBody({
  payload,
  stage,
  viewportRef,
  contentRef,
  onPointerDown,
}: {
  payload: FullscreenPreviewPayload;
  stage: PreviewStage;
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const pannable = payload.kind !== "html";
  return (
    <div
      ref={viewportRef}
      className="relative h-full min-h-0 overflow-hidden bg-card"
      onPointerDown={onPointerDown}
      style={{ cursor: pannable && stage.percent > 100 ? "grab" : "default" }}
    >
      <div
        ref={contentRef}
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${stage.x}px, ${stage.y}px) scale(${stage.percent / 100})`,
          transformOrigin: "0 0",
        }}
      >
        <PreviewContentView payload={payload} />
      </div>
    </div>
  );
}

function PreviewContentView({ payload }: { payload: FullscreenPreviewPayload }) {
  if (payload.kind === "image") {
    return <img src={payload.dataUrl} alt={payload.title} className="block max-w-none" draggable={false} />;
  }
  if (payload.kind === "svg") {
    return (
      <div
        className="notebook-ai-artifact-svg"
        style={payload.background ? { background: payload.background } : undefined}
        dangerouslySetInnerHTML={{ __html: normalizeSvgIntrinsicSize(payload.markup) }}
      />
    );
  }
  if (payload.kind === "math") return <MathPreview source={payload.source} />;
  if (payload.kind === "chart") return <PreviewChart payload={payload} />;
  return (
    <iframe
      title={payload.title}
      sandbox="allow-scripts"
      className="h-[640px] w-[880px] border-0 bg-card"
      srcDoc={wrapHtmlDocument(payload.html, {
        title: payload.title,
        background: payload.background,
        color: payload.foreground,
        border: payload.border,
      })}
    />
  );
}

function MathPreview({ source }: { source: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void renderMathPreview(source, true).then((next) => {
      if (active) setHtml(next);
    }).catch(() => {
      if (active) setHtml("");
    });
    return () => {
      active = false;
    };
  }, [source]);
  return (
    <div className="katex-display px-6 py-4" dangerouslySetInnerHTML={html ? { __html: html } : undefined} />
  );
}
