import { DefaultFontSelect } from "../../shared/DefaultFontSelect";
import type { useAppearanceSettings } from "./useAppearanceSettings";

export function renderDefaultFontSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const { customFonts, setCustomFont } = context;
  return (
    <DefaultFontSelect
      id="appearance-default-font"
      value={customFonts.default.font}
      onChange={(font) => setCustomFont("default", font)}
    />
  );
}
