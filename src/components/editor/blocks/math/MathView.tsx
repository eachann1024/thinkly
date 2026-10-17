import { useEffect, useReducer } from "react";
import { usePreviewVisibility } from "../shared/usePreviewVisibility";
import { renderMathPreview } from "./mathPreviewCache";

import { previewRenderReducer, previewRenderHTML } from "../shared/previewRenderState";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/math/MathView.tsx#messages:1">`
zh-Hans:
  addFormula: "添加公式"
  thisFormulaCannotBeDisplayedCheckTheSource: "公式无法显示，请查看源码"
en:
  addFormula: "Add formula"
  thisFormulaCannotBeDisplayedCheckTheSource: "This formula cannot be displayed. Check the source."
ja:
  addFormula: "数式を追加"
  thisFormulaCannotBeDisplayedCheckTheSource: "数式を表示できません。ソースを確認してください"
`;
const t = createTranslator(messages);


interface MathViewProps {
  value: string;
  displayMode?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({
  value,
  displayMode = false,
}) => {
  useLocale();
  const { previewRef, activated } = usePreviewVisibility<HTMLSpanElement>(!displayMode);
  const [renderState, dispatch] = useReducer(previewRenderReducer, { phase: "idle" });
  const identity = JSON.stringify([value, displayMode]);
  const html = previewRenderHTML(renderState);
  const result = renderState.phase === "loading" ? renderState.previous : renderState;
  const ready = result !== undefined && result.phase !== "idle";
  const placeholder = result?.phase === "empty" ? t("addFormula")
    : result?.phase === "error" ? t("thisFormulaCannotBeDisplayedCheckTheSource") : undefined;

  useEffect(() => {
    if (!activated) return;
    dispatch({ type: "render-requested", identity });
    let active = true;
    let idle: number | null = null;
    const renderMath = async () => {
      try {
        if (!value.trim()) {
          if (previewRef.current && active) {
            dispatch({ type: "empty", identity });
          }
          return;
        }
        const html = await renderMathPreview(value, displayMode);
        if (!previewRef.current || !active) return;
        dispatch({ type: "rendered", identity, html });
      } catch {
        if (!previewRef.current || !active) return;
        dispatch({ type: "failed", identity });
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
  }, [activated, value, displayMode, previewRef, identity]);

  return (
    <span
      ref={previewRef}
      aria-busy={!ready || undefined}
      dangerouslySetInnerHTML={html ? { __html: html } : undefined}
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
    >
      {html ? null : placeholder}
    </span>
  );
};
