import { Button } from "@/components/editor/ui/button";
import { colorPanelBoxStyle } from "./colorPanelGeometry";
import {
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  COLOR_PREVIEW,
  BG_PREVIEW,
} from "./colorPalette";
import { isColorSwatchSelected } from "./heldColorSelection";
import type { useColorPanelState } from "./useColorPanelState";
import type { useColorActions } from "./useColorActions";
import { useOverlayLayer } from "@/components/ui/overlay-layer";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/ColorPickerPanel.tsx#messages:1">`
zh-Hans:
  textColor: "文本颜色"
  backgroundColor: "背景颜色"
en:
  textColor: "Text color"
  backgroundColor: "Background color"
`;
const t = createTranslator(messages);


export function ColorPickerPanel({
  panel,
  actions,
}: {
  panel: ReturnType<typeof useColorPanelState>;
  actions: ReturnType<typeof useColorActions>;
}) {
  useLocale();
  const layer = useOverlayLayer("menu");
  const {
    isMounted,
    position,
    panelRef,
    isOpen,
    handleMouseEnter,
    handleMouseLeave,
    currentTextColor,
    currentBgColor,
  } = panel;
  const { applyTextColor, applyBackgroundColor, applyColorPair } = actions;
  return isMounted && position ? (
    <div
      ref={panelRef}
      className="goose-color-picker-float"
      data-open={isOpen ? "true" : "false"}
      data-side={position.showAbove ? "above" : "below"}
      onMouseDown={(e) => e.preventDefault()}
      style={{ ...colorPanelBoxStyle(position), zIndex: layer }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="goose-color-picker-panel goose-menu-surface flex flex-col">
        <div className="goose-color-picker-title goose-menu-label">
          {t("textColor")}
        </div>
        <div className="goose-color-picker-grid goose-list-group grid" data-goose-layout="grid">
          {TEXT_COLORS.map((item, index) => (
            <Button
              key={item.color}
              aria-pressed={isColorSwatchSelected(currentTextColor, item.color)}
              type="button"
              variant="ghost"
              size="icon"
              className="goose-color-picker-swatch goose-accent-selection h-7 w-7 min-h-7 min-w-7 shrink-0 border border-transparent p-0"
              onClick={() => {
                applyTextColor(item.color);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyColorPair(index);
              }}
            >
              <div
                className="goose-color-picker-letter font-serif leading-none"
                style={{
                  color:
                    item.color === "default"
                      ? undefined
                      : COLOR_PREVIEW[item.color],
                }}
              >
                A
              </div>
            </Button>
          ))}
        </div>

        <div className="goose-color-picker-title goose-menu-label">
          {t("backgroundColor")}
        </div>
        <div className="goose-color-picker-grid goose-color-picker-grid-last goose-list-group grid" data-goose-layout="grid">
          {HIGHLIGHT_COLORS.map((item, index) => (
            <Button
              key={item.color}
              aria-pressed={isColorSwatchSelected(currentBgColor, item.color)}
              type="button"
              variant="ghost"
              size="icon"
              className="goose-color-picker-swatch goose-accent-selection h-7 w-7 min-h-7 min-w-7 shrink-0 border border-transparent p-0 hover:border-border/80"
              onClick={() => {
                applyBackgroundColor(item.color);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyColorPair(index);
              }}
            >
              <div
                className="goose-color-picker-background-swatch border border-border/20"
                style={{
                  backgroundColor:
                    item.color === "default"
                      ? "transparent"
                      : BG_PREVIEW[item.color],
                }}
              />
            </Button>
          ))}
        </div>
      </div>
    </div>
  ) : null;
}
