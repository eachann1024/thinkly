import { useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { applySelectionFormatColors } from "./selectionColorActions";
import {
  COLOR_PREVIEW,
  BG_PREVIEW,
} from "./colorPalette";
import {
  readLastFormatColors,
  writeLastFormatColors,
  selectionUsesLastFormatColors,
  type LastFormatColors,
} from "./lastFormatColors";
import type { useColorPanelState } from "./useColorPanelState";

export function useColorActions(
  editor: BlockNoteEditor<any, any, any>,
  panel: ReturnType<typeof useColorPanelState>,
) {
  const { applyWithHeldSelection, displayColors } = panel;
  const [lastColors, setLastColors] =
    useState<LastFormatColors>(readLastFormatColors);

  const applyColors = (colors: LastFormatColors) => {
    const textColor = colors.textColor ?? "default";
    const backgroundColor = colors.backgroundColor ?? "default";
    applyWithHeldSelection(
      () => applySelectionFormatColors(editor, { textColor, backgroundColor }),
      { textColor, backgroundColor },
    );
  };

  const applyTextColor = (color: string) => {
    const colors = { textColor: color, backgroundColor: "default" };
    applyColors(colors);
    rememberLastFormatColors(colors);
  };

  const applyBackgroundColor = (color: string) => {
    const colors = { textColor: "default", backgroundColor: color };
    applyColors(colors);
    rememberLastFormatColors(colors);
  };

  const rememberLastFormatColors = (patch: LastFormatColors) => {
    writeLastFormatColors(patch);
    setLastColors(readLastFormatColors());
  };

  const lastTextPreview =
    lastColors.textColor && lastColors.textColor !== "default"
      ? COLOR_PREVIEW[lastColors.textColor]
      : undefined;
  const lastBgPreview =
    lastColors.backgroundColor && lastColors.backgroundColor !== "default"
      ? BG_PREVIEW[lastColors.backgroundColor]
      : undefined;
  const lastColorBar = lastBgPreview ?? lastTextPreview;

  const applyLastFormatColors = () => {
    const last = readLastFormatColors();
    if (last.textColor === undefined && last.backgroundColor === undefined) {
      return;
    }
    const clearing = selectionUsesLastFormatColors(displayColors, last);
    applyColors(clearing
      ? { textColor: "default", backgroundColor: "default" }
      : last);
  };

  return {
    applyTextColor,
    applyBackgroundColor,
    applyLastFormatColors,
    lastTextPreview,
    lastColorBar,
  };
}
