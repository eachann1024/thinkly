import { useEffect, useState } from "react";
import { usePreviewVisibility } from "../shared/usePreviewVisibility";
import { renderMathPreview } from "./mathPreviewCache";

interface MathViewProps {
  value: string;
  displayMode?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({
  value,
  displayMode = false,
}) => {
  const { previewRef, activated } = usePreviewVisibility<HTMLSpanElement>(!displayMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!activated) return;
    let active = true;
    let idle: number | null = null;
    const renderMath = async () => {
      try {
        if (!value.trim()) {
          if (previewRef.current && active) {
            previewRef.current.textContent = "添加公式";
            setReady(true);
          }
          return;
        }
        const html = await renderMathPreview(value, displayMode);
        if (!previewRef.current || !active) return;
        previewRef.current.innerHTML = html;
        setReady(true);
      } catch {
        if (!previewRef.current || !active) return;
        previewRef.current.textContent = "公式无法显示，请查看源码";
        setReady(true);
      }
    };
    if (displayMode && typeof requestIdleCallback === "function") {
      idle = requestIdleCallback(() => { void renderMath(); }, { timeout: 500 });
    } else {
      void renderMath();
    }
    return () => {
      active = false;
      if (idle !== null) cancelIdleCallback(idle);
    };
  }, [activated, value, displayMode, previewRef]);

  return (
    <span
      ref={previewRef}
      aria-busy={!ready || undefined}
      className={`${displayMode ? "block" : "inline-block"}${value.trim() ? "" : " text-xs text-muted-foreground"}`}
      style={
        displayMode
          ? {
              margin: "calc(16px * var(--editor-scale, 1)) 0",
              minHeight: ready ? undefined : "calc(48px * var(--editor-scale, 1))",
              contentVisibility: "auto",
              containIntrinsicSize: "auto calc(48px * var(--editor-scale, 1))",
            }
          : { padding: "0 calc(4px * var(--editor-scale, 1))" }
      }
    />
  );
};
