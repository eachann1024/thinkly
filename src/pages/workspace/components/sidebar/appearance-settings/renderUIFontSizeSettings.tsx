import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/renderUIFontSizeSettings.tsx#localMessages:1">`
zh-Hans:
  interfaceScale_b560: "界面缩放"
  scaleTheTitleBarSidebarAnd_4d3f: "缩放标题栏、侧栏与设置面板；图标大小固定，正文字号保持独立。"
  resetToDefault100_b566: "恢复默认 (100%)"
en:
  interfaceScale_b560: "Interface scale"
  scaleTheTitleBarSidebarAnd_4d3f: "Scale the title bar, sidebar, and settings. Icon size stays fixed; note text size is controlled separately."
  resetToDefault100_b566: "Reset to default (100%)"
ja:
  interfaceScale_b560: "インターフェイスの拡大率"
  scaleTheTitleBarSidebarAnd_4d3f: "タイトルバー、サイドバー、設定パネルを拡大・縮小します。アイコンのサイズは固定で、本文の文字サイズとは別に設定されます。"
  resetToDefault100_b566: "デフォルトに戻す (100%)"
`;
const uiText = createTranslator(localMessages);
import { Range } from "@/components/ui/range";
import * as GooseIcons from "@/components/ui/icons";
import {
  DEFAULT_UI_FONT_SIZE,
  UI_SCALE_MIN,
  UI_SCALE_MAX,
} from "@/stores/settings/types";
import type { useAppearanceSettings } from "./useAppearanceSettings";
import { APPEARANCE_OPTION_ROW_CLASS } from "./shared";

export function renderUIFontSizeSettings(
  context: ReturnType<typeof useAppearanceSettings>,
) {
  const {
    uiFontSize,
    setUIFontSize,
    unlockScaleDragLayout,
    lockScaleDragLayout,
  } = context;
  return (
    <div className={`space-y-4 ${APPEARANCE_OPTION_ROW_CLASS} goose-settings-option-row--stack`}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="interface-scale" className="flex items-center gap-3 leading-5">
          <GooseIcons.AppWindow
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          {uiText("interfaceScale_b560")}</Label>
        <output htmlFor="interface-scale" className="text-sm tabular-nums">
          {uiFontSize}%
        </output>
      </div>
      <p className="text-xs text-muted-foreground">
        {uiText("scaleTheTitleBarSidebarAnd_4d3f")}</p>
      <Range
        id="interface-scale"
        min={UI_SCALE_MIN}
        max={UI_SCALE_MAX}
        step={1}
        value={uiFontSize}
        aria-valuetext={`${uiFontSize}%`}
        className="block h-6 cursor-pointer"
        onPointerDown={lockScaleDragLayout}
        onPointerUp={unlockScaleDragLayout}
        onPointerCancel={unlockScaleDragLayout}
        onLostPointerCapture={unlockScaleDragLayout}
        onChange={(event) => setUIFontSize(Number(event.target.value))}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{UI_SCALE_MIN}%</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={uiFontSize === DEFAULT_UI_FONT_SIZE}
          onClick={() => setUIFontSize(DEFAULT_UI_FONT_SIZE)}
        >
          {uiText("resetToDefault100_b566")}</Button>
        <span>{UI_SCALE_MAX}%</span>
      </div>
    </div>
  );
}
