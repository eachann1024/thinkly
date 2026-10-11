import { useEffect, useRef, useState } from "react";
import { useEditorPageContext, useEditorSettings } from "@/components/editor/platform/hostContext";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { renderCachedMermaid } from "@/lib/imageExport/mermaidCache";

interface MermaidViewProps {
  value: string;
}

export const MermaidView: React.FC<MermaidViewProps> = ({ value }) => {
  const [svg, setSvg] = useState<string>("");
  const { theme, features, customFonts } = useEditorSettings();
  const { page } = useEditorPageContext();
  const fontIdentity = JSON.stringify([page?.fontFamily, customFonts]);
  const resolvedTheme = useResolvedTheme(theme);
  const skipDebounceRef = useRef(true);

  useEffect(() => {
    let active = true;
    const isDark = resolvedTheme === "dark";

    const renderMermaid = async () => {
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
        if (active) setSvg("");
      }
    };

    const delay = skipDebounceRef.current ? 0 : 500;
    skipDebounceRef.current = false;
    const debounceTimer = window.setTimeout(() => {
      void renderMermaid();
    }, delay);
    return () => {
      active = false;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [features.mermaidUnsafeHTML, value, resolvedTheme, fontIdentity]);

  if (!svg) return null;

  return (
    <div
      className="mermaid-preview flex justify-center overflow-x-auto bg-transparent"
      style={{ padding: "var(--editor-code-preview-padding, 16px)" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
