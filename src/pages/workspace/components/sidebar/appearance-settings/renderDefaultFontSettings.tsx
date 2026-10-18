import { DefaultFontSelect } from "../../shared/DefaultFontSelect";
import type { useAppearanceSettings } from "./useAppearanceSettings";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

export function renderDefaultFontSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const { customFonts, setCustomFont } = context;
  return (
    <div className={`${APPEARANCE_OPTION_ROW_CLASS} goose-settings-option-row--stack`}>
      <DefaultFontSelect
        id="appearance-default-font"
        value={customFonts.default.font}
        onChange={(font) => setCustomFont("default", font)}
      />
    </div>
  );
}
