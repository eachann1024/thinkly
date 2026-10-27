import { Input } from "@/components/editor/ui/input";
import { CodeBlockToolbar } from "./CodeBlockToolbar";
import { CodeLanguagePicker } from "./CodeLanguagePicker";
import { LANGUAGE_DISPLAY_NAMES } from "./codeBlockLanguages";
import type { CodeBlockViewProps } from "./codeBlockViewTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/CodeBlockHeader.tsx#messages:1">`
zh-Hans:
  addCodeCaption: "添加代码说明"
en:
  addCodeCaption: "Add code caption"
ja:
  addCodeCaption: "コードの説明を追加"
`;
const t = createTranslator(messages);


export function CodeBlockHeader({
  language,
  wrap,
  summary,
  isEditable,
  edit,
  preview,
}: CodeBlockViewProps) {
  useLocale();
  const {
    isEditingSummary,
    setIsEditingSummary,
    summaryDraft,
    setSummaryDraft,
    summaryInputRef,
    getCodeContent,
    handleLanguageChange,
    handleWrapChange,
    handleSummaryCommit,
    handleFormat,
  } = edit;
  const {
    isVisualBlock,
    visualTitle,
    previewMode,
    setPreviewMode,
    canPreview,
    handleInternalPreview,
    handleSystemPreview,
    handleDownloadPreview,
    handleCopyPreview,
  } = preview;
  const displayLanguage = isVisualBlock
    ? visualTitle
    : language
      ? LANGUAGE_DISPLAY_NAMES[language.toLowerCase()] || language
      : "Plain Text";
  return (
    <div className="goose-code-toolbar-row" contentEditable={false}>
      <div className="goose-code-toolbar-left">
        <CodeLanguagePicker
          language={language}
          onLanguageChange={handleLanguageChange}
          editable={isEditable}
          isMathOrMermaid={isVisualBlock}
          sourceMode={previewMode === "code"}
          displayLanguage={displayLanguage}
        />
        {!isVisualBlock && (isEditable || summary) && (
          <div
            className="goose-code-caption"
            data-filled={summary || isEditingSummary ? "true" : undefined}
          >
            <Input
              ref={summaryInputRef}
              variant="inline"
              value={isEditingSummary ? summaryDraft : summary}
              readOnly={!isEditable || !isEditingSummary}
              placeholder={t("addCodeCaption")}
              aria-label={t("addCodeCaption")}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (!isEditable) return;
                if (!isEditingSummary) setSummaryDraft(summary);
              }}
              onFocus={() => {
                if (!isEditable) return;
                if (!isEditingSummary) {
                  setSummaryDraft(summary);
                  setIsEditingSummary(true);
                }
              }}
              onChange={(e) => {
                if (!isEditingSummary) return;
                setSummaryDraft(e.target.value);
              }}
              onBlur={() => {
                if (!isEditingSummary) return;
                handleSummaryCommit();
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (isEditingSummary) handleSummaryCommit();
                  summaryInputRef.current?.blur();
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setSummaryDraft(summary);
                  setIsEditingSummary(false);
                  summaryInputRef.current?.blur();
                  return;
                }
                e.stopPropagation();
              }}
              className="goose-code-caption-input h-8 w-full min-w-0 px-3 text-xs"
            />
          </div>
        )}
      </div>
      <CodeBlockToolbar
        language={language}
        onLanguageChange={handleLanguageChange}
        getCodeContent={getCodeContent}
        onFormat={__GOOSE_EDITOR_COMPACT__ ? undefined : handleFormat}
        wrap={wrap}
        onWrapChange={handleWrapChange}
        editable={isEditable}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        onOpenPreview={() => {
          if (canPreview) void handleInternalPreview();
        }}
        onSystemPreview={() => {
          if (canPreview) void handleSystemPreview();
        }}
        onDownloadPreview={handleDownloadPreview}
        onCopyPreview={handleCopyPreview}
        canPreview={canPreview}
      />
    </div>
  );
}
