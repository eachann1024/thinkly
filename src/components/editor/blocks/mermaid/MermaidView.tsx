import { useEffect, useRef, useReducer } from "react";
import { useEditorPageContext, useEditorSettings } from "@/components/editor/platform/hostContext";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { renderCachedMermaid } from "@/lib/imageExport/mermaidCache";
import { usePreviewVisibility } from "../shared/usePreviewVisibility";
import { schedulePreviewCommit } from "../shared/previewCommitQueue";
import {
  readMermaidPreview, rememberMermaidPreview,
  instantiateMermaidPreview, rememberMermaidHeight,
} from "./mermaidPreviewCache";

import { previewRenderReducer, previewRenderHTML } from "../shared/previewRenderState";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/mermaid/MermaidView.tsx#messages:1">`
zh-Hans:
  previewUnavailableCheckTheSource: "无法预览，请查看源码"
  loadingDiagram: "图表加载中…"
en:
  previewUnavailableCheckTheSource: "Preview unavailable. Check the source."
  loadingDiagram: "Loading diagram…"
ja:
  previewUnavailableCheckTheSource: "プレビューできません。ソースを確認してください"
  loadingDiagram: "図を読み込み中…"
`;
const t = createTranslator(messages);


interface MermaidViewProps {
  value: string;
}

export const MermaidView: React.FC<MermaidViewProps> = ({ value }) => {
  useLocale();
  const [renderState, dispatch] = useReducer(previewRenderReducer, { phase: "idle" });
  const renderStateRef = useRef(renderState);
  renderStateRef.current = renderState;
  const svg = previewRenderHTML(renderState);
  const failed = renderState.phase === "error";
  const { previewRef, activated, near } = usePreviewVisibility(false, true);
  const { theme, features, customFonts } = useEditorSettings();
  const { page } = useEditorPageContext();
  const fontIdentity = JSON.stringify([page?.fontFamily, customFonts]);
  const resolvedTheme = useResolvedTheme(theme);
  const sourceRef = useRef(value);
  const identity = JSON.stringify([value, resolvedTheme, features.mermaidUnsafeHTML, fontIdentity]);
  const cachedHeight = readMermaidPreview(identity)?.height ?? 160;

  useEffect(() => {
    const node = previewRef.current;
    if (!node || !svg) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) rememberMermaidHeight(identity, entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [svg, identity, previewRef]);

  useEffect(() => {
    if (near) return;
    dispatch({ type: "release" });
  }, [near]);

  useEffect(() => {
    if (!activated || !near) return;
    const completed = renderStateRef.current;
    if ((completed.phase === "success" || completed.phase === "empty") && completed.identity === identity) return;
    dispatch({ type: "render-requested", identity });
    const controller = new AbortController();
    let active = true;
    let idle: number | null = null;
    let cancelCommit: (() => void) | undefined;
    const isDark = resolvedTheme === "dark";
    const cached = readMermaidPreview(identity);
    if (cached) {
      // A warm return skips IPC, the serial worker queue, source debounce and idle scheduling.
      cancelCommit = schedulePreviewCommit(() => {
        if (active) {
          dispatch({ type: "rendered", identity, html: instantiateMermaidPreview(cached) });
        }
      });
      return () => { active = false; cancelCommit?.(); };
    }

    const renderMermaid = async () => {
      if (!active) return;
      if (!value) {
        dispatch({ type: "empty", identity });
        return;
      }
      try {
        const svg = await renderCachedMermaid(value, {
          mode: isDark ? "dark" : "light",
          securityLevel: features.mermaidUnsafeHTML ? "loose" : "strict",
          fontFamily: previewRef.current ? getComputedStyle(previewRef.current).fontFamily : "inherit",
          useMaxWidth: true,
        }, "editor", fontIdentity, controller.signal);
        if (!active) return;
        cancelCommit = schedulePreviewCommit(() => {
          if (active) { rememberMermaidPreview(identity, svg); dispatch({ type: "rendered", identity, html: svg }); }
        });
      } catch {
        if (active) {
          dispatch({ type: "failed", identity });
        }
      }
    };

    const delay = sourceRef.current === value ? 0 : 500;
    sourceRef.current = value;
    const debounceTimer = window.setTimeout(() => {
      // 先让正文和输入响应；屏幕外图表不排进 Mermaid 的全局渲染队列。
      if (typeof requestIdleCallback === "function") {
        idle = requestIdleCallback(() => { void renderMermaid(); }, { timeout: 500 });
      } else {
        void renderMermaid();
      }
    }, delay);
    return () => {
      active = false;
      controller.abort();
      cancelCommit?.();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (idle !== null) cancelIdleCallback(idle);
    };
  }, [activated, near, features.mermaidUnsafeHTML, value, resolvedTheme, fontIdentity, identity, previewRef]);

  return (
    <div
      ref={previewRef}
      className="mermaid-preview flex items-center justify-center overflow-x-auto bg-transparent"
      style={{ padding: "var(--editor-code-preview-padding, 16px)", minHeight: svg ? undefined : cachedHeight, contentVisibility: "auto", containIntrinsicSize: `auto ${cachedHeight}px` }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? null : <span className="text-sm text-muted-foreground">
        {failed ? t("previewUnavailableCheckTheSource") : t("loadingDiagram")}
      </span>}
    </div>
  );
};
