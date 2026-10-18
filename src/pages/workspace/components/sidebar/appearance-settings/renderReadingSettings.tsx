import { ReadingPreferences } from "../../ReadingPreferences";
import type { useAppearanceSettings } from "./useAppearanceSettings";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

export function renderReadingSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const {
    editorFontSize,
    editorLineHeight,
    setEditorLineHeight,
    setEditorFontSize,
  } = context;
  return (
    <div className={`${APPEARANCE_OPTION_ROW_CLASS} goose-settings-option-row--stack`}>
      <ReadingPreferences
        showPreview={false}
        fontSize={editorFontSize}
        lineHeight={editorLineHeight}
        onFontSizeChange={setEditorFontSize}
        onLineHeightChange={setEditorLineHeight}
      />
    </div>
  );
}
