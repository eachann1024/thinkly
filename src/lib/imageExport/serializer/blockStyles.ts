import type { CardTheme } from "../themes";
import { BLOCKNOTE_TEXT_COLORS, BLOCKNOTE_BACKGROUND_COLORS, BLOCKNOTE_TEXT_COLORS_DARK, BLOCKNOTE_BACKGROUND_COLORS_DARK, resolveExportColor } from "./utils";

export function textPalette(theme?: CardTheme) {
  return theme?.mode === "dark" ? BLOCKNOTE_TEXT_COLORS_DARK : BLOCKNOTE_TEXT_COLORS;
}

export function bgPalette(theme?: CardTheme) {
  return theme?.mode === "dark" ? BLOCKNOTE_BACKGROUND_COLORS_DARK : BLOCKNOTE_BACKGROUND_COLORS;
}

export function collectBlockInlineStyles(block: any, theme: CardTheme): string {
  const styles: string[] = [];
  const align = block?.props?.textAlignment;
  if (align === "center" || align === "right" || align === "justify") {
    styles.push(`text-align:${align}`);
  }
  const tc = resolveExportColor(block?.props?.textColor, textPalette(theme));
  if (tc) styles.push(`color:${tc}`);
  const bg = resolveExportColor(block?.props?.backgroundColor, bgPalette(theme));
  if (bg) styles.push(`background-color:${bg}`);
  return styles.join(";");
}

export function buildBlockStyleAttr(block: any, theme: CardTheme): string {
  const css = collectBlockInlineStyles(block, theme);
  return css ? ` style="${css}"` : "";
}
