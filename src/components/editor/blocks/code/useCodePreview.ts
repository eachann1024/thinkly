import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useEditorPageContext, useEditorSettings } from "@/components/editor/platform/hostContext";
import { openFullscreenPreview } from "@/lib/preview/fullscreenPreviewWindow";
import { isDarkTheme, useCodePreviewActions } from "./useCodePreviewActions";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/useCodePreview.ts#messages:1">`
zh-Hans:
  nothingToPreview: "无可预览内容"
  formulaPreview: "公式预览"
  thisCodeBlockDoesNotSupportPreview: "当前代码块不支持预览"
  unknownError: "未知错误"
  previewFailed: "预览失败：{{error}}"
en:
  nothingToPreview: "Nothing to preview"
  formulaPreview: "Formula preview"
  thisCodeBlockDoesNotSupportPreview: "This code block does not support preview"
  unknownError: "Unknown error"
  previewFailed: "Preview failed: {{error}}"
ja:
  nothingToPreview: "プレビューできる内容がありません"
  formulaPreview: "数式のプレビュー"
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
  const { page } = useEditorPageContext();
  const { features } = useEditorSettings();
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState<"code" | "preview">(() =>
    !__GOOSE_EDITOR_COMPACT__ &&
    (language === "math" || language === "mermaid") &&
    getCodeContent().trim()
      ? "preview"
      : "code",
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
      const noteTitle = page ? getPageTitle(page) : undefined;

      if (language === "mermaid") {
        const { renderCachedMermaid } = await import("@/lib/imageExport/mermaidCache");
        const svg = await renderCachedMermaid(text, {
          mode: isDarkTheme(theme) ? "dark" : "light",
          securityLevel: features.mermaidUnsafeHTML ? "loose" : "strict",
          fontFamily: previewRef.current ? getComputedStyle(previewRef.current).fontFamily : "inherit",
          useMaxWidth: true,
        }, "editor");
        await openFullscreenPreview(
          { kind: "svg", markup: svg, fileName: "mermaid.svg", background: "transparent" },
          "Mermaid",
          noteTitle,
        );
        return;
      }

      if (language === "math") {
        await openFullscreenPreview(
          { kind: "math", source: text, fileName: "formula.html" },
          t("formulaPreview"),
          noteTitle,
        );
        return;
      }

      throw new Error(t("thisCodeBlockDoesNotSupportPreview"));
    } catch (err) {
      toast.error(
        t("previewFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
      );
    }
  }, [features.mermaidUnsafeHTML, getCodeContent, language, page, previewRef, theme]);

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
    if (!isVisualBlock || !canPreview) setPreviewMode("code");
  }, [isVisualBlock, canPreview]);

  return {
    ...actions,
    previewRef,
    previewMode,
    setPreviewMode,
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
