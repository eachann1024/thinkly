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
    <div className={`p-4 ${APPEARANCE_OPTION_ROW_CLASS}`}>
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
