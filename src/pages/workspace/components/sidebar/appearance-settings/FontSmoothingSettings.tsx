import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/FontSmoothingSettings.tsx#localMessages:1">`
zh-Hans:
  fontSmoothing: "字体平滑"
  fontSmoothingHint: "使用灰度抗锯齿，让文字更细、更柔和；关闭后使用系统默认渲染，字形更粗。"
en:
  fontSmoothing: "Font smoothing"
  fontSmoothingHint: "Use grayscale antialiasing for thinner, softer text. Turn off to use the system's default rendering with heavier glyphs."
ja:
  fontSmoothing: "フォントスムージング"
  fontSmoothingHint: "グレースケールのアンチエイリアスで文字を細く柔らかく表示します。オフにするとシステム標準の描画になり、字形が太くなります。"
`;
const uiText = createTranslator(localMessages);
import { Switch, SwitchRow } from "@/components/ui/switch";
import { isMacPlatform } from "@/lib/utils";
import { useSettings } from "@/stores/useSettings";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

const SWITCH_CLASS = "data-[state=unchecked]:bg-[hsl(var(--foreground)/0.12)]";

export function FontSmoothingSettings() {
  useLocale();
  const enabled = useSettings((state) => state.fontSmoothing);
  const setEnabled = useSettings((state) => state.setFontSmoothing);
  // -webkit-font-smoothing only changes rendering on macOS.
  if (!isMacPlatform()) return null;
  return (
    <SwitchRow className={`flex items-center justify-between gap-3 ${APPEARANCE_OPTION_ROW_CLASS}`}>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium leading-5">{uiText("fontSmoothing")}</span>
        <span className="text-xs leading-4 text-muted-foreground">{uiText("fontSmoothingHint")}</span>
      </span>
      <Switch
        id="appearance-font-smoothing"
        aria-label={uiText("fontSmoothing")}
        checked={enabled}
        onCheckedChange={setEnabled}
        className={SWITCH_CLASS}
      />
    </SwitchRow>
  );
}
