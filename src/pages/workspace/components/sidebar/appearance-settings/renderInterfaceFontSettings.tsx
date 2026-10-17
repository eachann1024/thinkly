import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/renderInterfaceFontSettings.tsx#localMessages:1">`
zh-Hans:
  interfaceFont_5f15: "界面字体"
en:
  interfaceFont_5f15: "Interface font"
`;
const uiText = createTranslator(localMessages);
import { Label } from "@/components/ui/label";
import { LocalFontSelect } from "../../shared/LocalFontSelect";
import type { useAppearanceSettings } from "./useAppearanceSettings";

export function renderInterfaceFontSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const { uiFontFamily, setUIFontFamily } = context;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label htmlFor="appearance-ui-font">{uiText("interfaceFont_5f15")}</Label>
      <LocalFontSelect
        id="appearance-ui-font"
        label={uiText("interfaceFont_5f15")}
        value={uiFontFamily}
        onChange={setUIFontFamily}
      />
    </div>
  );
}
