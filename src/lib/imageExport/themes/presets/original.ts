import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/original.ts#localMessages:1">`
zh-Hans:
  keepOriginalStyle: "保持原样式"
  copiesTheEditor: "字体、颜色、高亮照搬编辑器"
  original: "原样"
en:
  keepOriginalStyle: "Keep original style"
  copiesTheEditor: "Copies the editor's type, colors, and highlights"
  original: "Original"
ja:
  keepOriginalStyle: "元のスタイルを保つ"
  copiesTheEditor: "フォント、色、ハイライトはエディタのまま"
  original: "そのまま"
`;
const uiText = createTranslator(localMessages);
import type { CardTheme } from "../types";
import {
  buildNotebookCardTheme,
  type NotebookCardThemeContext,
} from "./notebook";

export function buildOriginalCardTheme(
  ctx: NotebookCardThemeContext = {},
): CardTheme {
  const base = buildNotebookCardTheme(ctx);
  return {
    ...base,
    id: "original",
    get name() {
      return uiText("keepOriginalStyle");
    },
    nameEn: "Original",
    get description() {
      return uiText("copiesTheEditor");
    },
    tags: [uiText("original")],
    titleFontWeight: 650,
    cardRadius: 0,
    cardBorder: "none",
    cardShadow: "none",
    containerPaddingX: 24,
    containerPaddingY: 24,
    cardPaddingX: 28,
    cardPaddingY: 28,
    decorations: [],
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  };
}

export const ORIGINAL_THEME: CardTheme = buildOriginalCardTheme();
