import { useEffect, useRef, useState } from "react";
import { useEditorPageContext, useEditorSettings } from "@/components/editor/platform/hostContext";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { renderCachedMermaid } from "@/lib/imageExport/mermaidCache";
import { usePreviewVisibility } from "../shared/usePreviewVisibility";
import { schedulePreviewCommit } from "../shared/previewCommitQueue";
import {
  readMermaidPreview, rememberMermaidPreview,
  instantiateMermaidPreview, rememberMermaidHeight,
} from "./mermaidPreviewCache";

interface MermaidViewProps {
  value: string;
}

export const MermaidView: React.FC<MermaidViewProps> = ({ value }) => {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const { previewRef, activated, near } = usePreviewVisibility(false, true);
  const { theme, features, customFonts } = useEditorSettings();
  const { page } = useEditorPageContext();
  const fontIdentity = JSON.stringify([page?.fontFamily, customFonts]);
  const resolvedTheme = useResolvedTheme(theme);
  const sourceRef = useRef(value);
  const renderedRef = useRef("");
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
    if (!activated || !near) return;
    if (renderedRef.current === identity) return;
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
          renderedRef.current = identity;
          setFailed(false);
          setSvg(instantiateMermaidPreview(cached));
        }
      });
      return () => { active = false; cancelCommit?.(); };
    }

    const renderMermaid = async () => {
      if (!active) return;
      setFailed(false);
      if (!value) {
        setSvg("");
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
          if (active) { renderedRef.current = identity; rememberMermaidPreview(identity, svg); setSvg(svg); }
        });
      } catch {
        if (active) {
          setSvg("");
          setFailed(true);
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
        {failed ? "无法预览，请查看源码" : "图表加载中…"}
      </span>}
    </div>
  );
};
