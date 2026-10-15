import { Label } from "@/components/ui/label";
import { LocalFontSelect } from "../../shared/LocalFontSelect";
import type { useAppearanceSettings } from "./useAppearanceSettings";

export function renderInterfaceFontSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const { uiFontFamily, setUIFontFamily } = context;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label htmlFor="appearance-ui-font">界面字体</Label>
      <LocalFontSelect
        id="appearance-ui-font"
        label="界面字体"
        value={uiFontFamily}
        onChange={setUIFontFamily}
      />
    </div>
  );
}
