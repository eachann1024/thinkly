import { EditorAction } from "@/components/editor/ui/button";
import { useBlockNoteEditor } from "@blocknote/react";
import * as GooseIcons from "@/components/ui/icons";
import { Portal } from "@/components/editor/ui/portal";
import { cn } from "@/components/editor/utils/cn";
import { useSelectionColorState } from "./useSelectionColors";
import { useColorPanelState } from "./useColorPanelState";
import { useColorActions } from "./useColorActions";
import { ColorPickerPanel } from "./ColorPickerPanel";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/ColorPicker.tsx#messages:1">`
zh-Hans:
  chooseATextOrBackgroundColorClickTo: "选择文本或背景颜色；点击应用上次颜色"
  colorMixedFormattingClickToApplyTheLast: "颜色选择（混合格式）；点击应用上次颜色"
  colorClickToApplyTheLastColor: "颜色选择；点击应用上次颜色"
en:
  chooseATextOrBackgroundColorClickTo: "Choose a text or background color; click to apply the last color"
  colorMixedFormattingClickToApplyTheLast: "Color (mixed formatting); click to apply the last color"
  colorClickToApplyTheLastColor: "Color; click to apply the last color"
`;
const t = createTranslator(messages);


export { getColorPanelPosition } from "./colorPanelGeometry";
export {
  resolveHeldTextSelection,
  resolveHeldColorState,
  resolveOpenColorState,
  applyHeldColorPatch,
  isColorSwatchSelected,
} from "./heldColorSelection";
export { selectionUsesLastFormatColors } from "./lastFormatColors";

export function FormattingToolbarColorPicker({
  onOpenChange,
}: { onOpenChange?: (open: boolean) => void } = {}) {
  useLocale();
  const editor = useBlockNoteEditor();
  const selectionColors = useSelectionColorState(editor);
  const panel = useColorPanelState(editor, selectionColors, onOpenChange);
  const actions = useColorActions(editor, panel);
  const {
    handleMouseEnter,
    handleMouseLeave,
    buttonRef,
    isMounted,
    isTextColorActive,
    isBgColorActive,
    isTextMixed,
    isBgMixed,
  } = panel;
  const { applyLastFormatColors, lastTextPreview, lastColorBar } = actions;
  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <EditorAction
        type="button"
        ref={buttonRef}
        data-goose-preserve-icon-color="true"
        data-format-state={isTextMixed || isBgMixed ? "mixed" : undefined}
        aria-pressed={
          isMounted ||
          isTextColorActive ||
          isBgColorActive ||
          isTextMixed ||
          isBgMixed
        }
        className={cn("goose-formatting-toolbar-control")}
        title={t("chooseATextOrBackgroundColorClickTo")}
        aria-label={isTextMixed || isBgMixed
          ? t("colorMixedFormattingClickToApplyTheLast")
          : t("colorClickToApplyTheLastColor")}
        onClick={() => {
          applyLastFormatColors();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyLastFormatColors();
        }}
      >
        <span className="relative inline-flex size-4 items-center justify-center">
          <GooseIcons.Palette
            aria-hidden="true"
            className="size-4"
            style={lastTextPreview ? { color: lastTextPreview } : undefined}
          />
          {lastColorBar ? (
            <span
              className="absolute inset-x-0.5 bottom-0 h-0.5 rounded-marker"
              style={{ background: lastColorBar }}
            />
          ) : null}
        </span>
      </EditorAction>
      <Portal>
        <ColorPickerPanel panel={panel} actions={actions} />
      </Portal>
    </div>
  );
}
