import { useEffect, useRef, useState } from "react";
import { useEditorPageContext, useEditorSettings } from "@/components/editor/platform/hostContext";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { renderCachedMermaid } from "@/lib/imageExport/mermaidCache";
import { usePreviewVisibility } from "./usePreviewVisibility";

interface MermaidViewProps {
  value: string;
}

export const MermaidView: React.FC<MermaidViewProps> = ({ value }) => {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const { previewRef, activated } = usePreviewVisibility();
  const { theme, features, customFonts } = useEditorSettings();
  const { page } = useEditorPageContext();
  const fontIdentity = JSON.stringify([page?.fontFamily, customFonts]);
  const resolvedTheme = useResolvedTheme(theme);
  const skipDebounceRef = useRef(true);

  useEffect(() => {
    if (!activated) return;
    let active = true;
    let idle: number | null = null;
    const isDark = resolvedTheme === "dark";

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
          fontFamily: "inherit",
          useMaxWidth: true,
        }, "editor", fontIdentity);
        if (!active) return;
        setSvg(svg);
      } catch {
        if (active) {
          setSvg("");
          setFailed(true);
        }
      }
    };

    const delay = skipDebounceRef.current ? 0 : 500;
    skipDebounceRef.current = false;
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
      if (debounceTimer) clearTimeout(debounceTimer);
      if (idle !== null) cancelIdleCallback(idle);
    };
  }, [activated, features.mermaidUnsafeHTML, value, resolvedTheme, fontIdentity]);

  return (
    <div
      ref={previewRef}
      className="mermaid-preview flex items-center justify-center overflow-x-auto bg-transparent"
      style={{ padding: "var(--editor-code-preview-padding, 16px)", minHeight: svg ? undefined : 160 }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? null : <span className="text-sm text-muted-foreground">
        {failed ? "无法预览，请查看源码" : "图表加载中…"}
      </span>}
    </div>
  );
};
