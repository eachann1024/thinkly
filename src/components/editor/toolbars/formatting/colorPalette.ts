import { documentTextColors } from "@/lib/textColors";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/colorPalette.ts#messages:1">`
zh-Hans:
  default: "默认"
  gray: "灰色"
  brown: "褐色"
  red: "红色"
  orange: "橙色"
  yellow: "黄色"
  green: "绿色"
  blue: "蓝色"
  purple: "紫色"
  pink: "粉色"
  noBackground: "无背景"
  grayBackground: "灰色背景"
  brownBackground: "褐色背景"
  redBackground: "红色背景"
  orangeBackground: "橙色背景"
  yellowBackground: "黄色背景"
  greenBackground: "绿色背景"
  blueBackground: "蓝色背景"
  purpleBackground: "紫色背景"
  pinkBackground: "粉色背景"
en:
  default: "Default"
  gray: "Gray"
  brown: "Brown"
  red: "Red"
  orange: "Orange"
  yellow: "Yellow"
  green: "Green"
  blue: "Blue"
  purple: "Purple"
  pink: "Pink"
  noBackground: "No background"
  grayBackground: "Gray background"
  brownBackground: "Brown background"
  redBackground: "Red background"
  orangeBackground: "Orange background"
  yellowBackground: "Yellow background"
  greenBackground: "Green background"
  blueBackground: "Blue background"
  purpleBackground: "Purple background"
  pinkBackground: "Pink background"
ja:
  default: "デフォルト"
  gray: "グレー"
  brown: "ブラウン"
  red: "レッド"
  orange: "オレンジ"
  yellow: "イエロー"
  green: "グリーン"
  blue: "ブルー"
  purple: "パープル"
  pink: "ピンク"
  noBackground: "背景なし"
  grayBackground: "グレーの背景"
  brownBackground: "ブラウンの背景"
  redBackground: "レッドの背景"
  orangeBackground: "オレンジの背景"
  yellowBackground: "イエローの背景"
  greenBackground: "グリーンの背景"
  blueBackground: "ブルーの背景"
  purpleBackground: "パープルの背景"
  pinkBackground: "ピンクの背景"
`;
const t = createTranslator(messages);


/** BlockNote 命名颜色 —— 必须与 BlockNote CSS 中定义的颜色名一致 */
export const TEXT_COLORS = [
  { get name() { return t("default"); }, color: "default" },
  { get name() { return t("gray"); }, color: "gray" },
  { get name() { return t("brown"); }, color: "brown" },
  { get name() { return t("red"); }, color: "red" },
  { get name() { return t("orange"); }, color: "orange" },
  { get name() { return t("yellow"); }, color: "yellow" },
  { get name() { return t("green"); }, color: "green" },
  { get name() { return t("blue"); }, color: "blue" },
  { get name() { return t("purple"); }, color: "purple" },
  { get name() { return t("pink"); }, color: "pink" },
];

export const HIGHLIGHT_COLORS = [
  { get name() { return t("noBackground"); }, color: "default" },
  { get name() { return t("grayBackground"); }, color: "gray" },
  { get name() { return t("brownBackground"); }, color: "brown" },
  { get name() { return t("redBackground"); }, color: "red" },
  { get name() { return t("orangeBackground"); }, color: "orange" },
  { get name() { return t("yellowBackground"); }, color: "yellow" },
  { get name() { return t("greenBackground"); }, color: "green" },
  { get name() { return t("blueBackground"); }, color: "blue" },
  { get name() { return t("purpleBackground"); }, color: "purple" },
  { get name() { return t("pinkBackground"); }, color: "pink" },
];

/**
 * 颜色名 → CSS 颜色值。
 * 文字预览在笔记本和速记中共用全局色表；背景预览保留各入口现有色带。
 */
const previewColor = (token: string, fallback: string) =>
  `var(${token}, ${fallback})`;

export const COLOR_PREVIEW: Record<string, string> = Object.fromEntries(
  Object.entries(documentTextColors("light")).map(([name, fallback]) => [
    name,
    `var(--goose-editor-highlight-${name}-text, ${fallback})`,
  ]),
);

export const BG_PREVIEW: Record<string, string> = {
  gray: previewColor("--goose-editor-highlight-gray-bg", "#ebeced"),
  brown: previewColor("--goose-editor-highlight-brown-bg", "#e9e5e3"),
  red: previewColor("--goose-editor-highlight-red-bg", "#fbe4e4"),
  orange: previewColor("--goose-editor-highlight-orange-bg", "#f6e9d9"),
  yellow: previewColor("--goose-editor-highlight-yellow-bg", "#fbf3db"),
  green: previewColor("--goose-editor-highlight-green-bg", "#ddedea"),
  blue: previewColor("--goose-editor-highlight-blue-bg", "#ddebf1"),
  purple: previewColor("--goose-editor-highlight-purple-bg", "#eae4f2"),
  pink: previewColor("--goose-editor-highlight-pink-bg", "#f4dfeb"),
};

export const MIXED = "__mixed__";
