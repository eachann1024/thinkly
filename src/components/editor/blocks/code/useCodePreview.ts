import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { renderMermaidSvgForExport } from "@/lib/imageExport/mermaid";
import type { PreviewContent } from "@/lib/preview/previewAction";
import { isDarkTheme, useCodePreviewActions } from "./useCodePreviewActions";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/useCodePreview.ts#messages:1">`
zh-Hans:
  nothingToPreview: "无可预览内容"
  thisCodeBlockDoesNotSupportPreview: "当前代码块不支持预览"
  unknownError: "未知错误"
  previewFailed: "预览失败：{{error}}"
en:
  nothingToPreview: "Nothing to preview"
  thisCodeBlockDoesNotSupportPreview: "This code block does not support preview"
  unknownError: "Unknown error"
  previewFailed: "Preview failed: {{error}}"
ja:
  nothingToPreview: "プレビューできる内容がありません"
  thisCodeBlockDoesNotSupportPreview: "このコードブロックはプレビューに対応していません"
  unknownError: "不明なエラー"
  previewFailed: "プレビューに失敗しました：{{error}}"
`;
const t = createTranslator(messages);


export function useCodePreview(
  getCodeContent: () => string,
  language: string,
  wrap: boolean,
  theme: string | undefined,
) {
  useLocale();
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState<"code" | "preview">(() =>
    !__GOOSE_EDITOR_COMPACT__ &&
    (language === "math" || language === "mermaid") &&
    getCodeContent().trim()
      ? "preview"
      : "code",
  );
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(
    null,
  );
  const actions = useCodePreviewActions({
    getCodeContent,
    language,
    theme,
    previewRef,
  });
  const handleInternalPreview = useCallback(async () => {
    try {
      const text = getCodeContent().trim();
      if (!text) throw new Error(t("nothingToPreview"));

      if (language === "mermaid") {
        const svg = await renderMermaidSvgForExport(
          text,
          isDarkTheme(theme) ? "dark" : "light",
        );
        setPreviewContent({
          kind: "svg",
          markup: svg,
          fileName: "mermaid.svg",
          background: isDarkTheme(theme) ? "#1F1E1C" : "#ffffff",
        });
        return;
      }

      if (language === "math") {
        setPreviewContent({
          kind: "math",
          source: text,
          fileName: "formula.html",
        });
        return;
      }

      throw new Error(t("thisCodeBlockDoesNotSupportPreview"));
    } catch (err) {
      toast.error(
        t("previewFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
      );
    }
  }, [getCodeContent, language, theme]);

  const textContent = getCodeContent();
  const lineCount = textContent.split("\n").length;
  const isMathOrMermaid =
    !__GOOSE_EDITOR_COMPACT__ &&
    (language === "math" || language === "mermaid");
  const isVisualBlock = isMathOrMermaid;
  const canPreview = isMathOrMermaid && textContent.trim().length > 0;
  const shouldShowPreview = canPreview && previewMode === "preview";
  const shouldShowSource =
    !isVisualBlock || previewMode === "code" || !canPreview;
  const showLineNumbers = !isVisualBlock && !wrap;
  const visualTitle = language === "math" ? "Math" : "Mermaid";

  useEffect(() => {
    if (!isVisualBlock || !canPreview) {
      setPreviewMode("code");
      setPreviewContent(null);
    }
  }, [isVisualBlock, canPreview]);

  return {
    ...actions,
    previewRef,
    previewMode,
    setPreviewMode,
    previewContent,
    setPreviewContent,
    handleInternalPreview,
    textContent,
    lineCount,
    isVisualBlock,
    canPreview,
    shouldShowPreview,
    shouldShowSource,
    showLineNumbers,
    visualTitle,
  };
}
