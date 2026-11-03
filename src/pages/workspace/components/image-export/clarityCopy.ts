import { createTranslator, getFormatLocale, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/clarityCopy.ts#localMessages:1">`
zh-Hans:
  fixed: "固定 3× 高清导出，屏幕和打印都清楚。"
  degraded: "单张图片上限 1600 万像素，这篇较长，清晰度自动降到 {{ratio}}×，文字依然清楚。"
  soft: "内容太长，清晰度只能降到 {{ratio}}×，文字会发虚。建议只导出需要的部分。"
  impossible: "内容过长，无法导出为单张图片。请缩小范围后再试。"
  emptyNote: "没有选中内容，暂时无法生成。"
  cannotExport: "无法导出"
  overLimit: "超出单张图片上限"
  nothingSelected: "未选中内容"
  blankSize: "— × — px"
en:
  fixed: "Fixed 3× export, sharp on screen and in print."
  degraded: "A single image is limited to 16 million pixels. This note is long, so clarity drops to {{ratio}}×. Text stays clear."
  soft: "The content is so long that clarity can only drop to {{ratio}}×, and text will look soft. Export just the part you need."
  impossible: "The content is too long to export as one image. Narrow the range and try again."
  emptyNote: "Nothing is selected, so an image can’t be generated yet."
  cannotExport: "Can’t export"
  overLimit: "Over the single-image limit"
  nothingSelected: "Nothing selected"
  blankSize: "— × — px"
ja:
  fixed: "3× 固定の高精細書き出しです。画面でも印刷でもはっきり読めます。"
  degraded: "1 枚の上限は 1600 万ピクセルです。長いので鮮明度は {{ratio}}× まで下がりますが、文字は読めます。"
  soft: "長すぎるため鮮明度は {{ratio}}× までしか下げられず、文字がぼやけます。必要な部分だけ書き出してください。"
  impossible: "長すぎて 1 枚の画像には書き出せません。範囲を狭めてからやり直してください。"
  emptyNote: "選択がないため、まだ画像を生成できません。"
  cannotExport: "書き出せません"
  overLimit: "1 枚の上限を超えています"
  nothingSelected: "未選択"
  blankSize: "— × — px"
`;
const uiText = createTranslator(localMessages);

export type ClarityTone = "normal" | "warning" | "danger";

export function describeExportClarity(input: {
  empty: boolean;
  width: number;
  height: number | null;
  ratio: number | null;
  scope: "page" | "selection";
}): {
  note: string;
  tone: ClarityTone;
  dims: string;
  ratioLabel: string;
  chip: string;
  suggestSelection: boolean;
  blocked: boolean;
} {
  const blank = uiText("blankSize");
  if (input.empty) {
    return {
      note: uiText("emptyNote"),
      tone: "normal",
      dims: blank,
      ratioLabel: "",
      chip: uiText("nothingSelected"),
      suggestSelection: false,
      blocked: true,
    };
  }
  const ratio = input.ratio;
  if (ratio == null || input.height == null) {
    return {
      note: uiText("fixed"),
      tone: "normal",
      dims: blank,
      ratioLabel: "",
      chip: blank,
      suggestSelection: false,
      blocked: false,
    };
  }
  const suggestSelection = input.scope === "page" && ratio < 1;
  if (ratio === 0) {
    return {
      note: uiText("impossible"),
      tone: "danger",
      dims: blank,
      ratioLabel: uiText("cannotExport"),
      chip: uiText("overLimit"),
      suggestSelection,
      blocked: true,
    };
  }
  const dims = `${formatPx(input.width * ratio)} × ${formatPx(input.height * ratio)} px`;
  const ratioLabel = `${ratio}×`;
  if (ratio >= 1 && ratio < 3) {
    return {
      note: uiText("degraded", { ratio }),
      tone: "warning",
      dims,
      ratioLabel,
      chip: `${dims} · ${ratioLabel}`,
      suggestSelection,
      blocked: false,
    };
  }
  if (ratio < 1) {
    return {
      note: uiText("soft", { ratio }),
      tone: "warning",
      dims,
      ratioLabel,
      chip: `${dims} · ${ratioLabel}`,
      suggestSelection,
      blocked: false,
    };
  }
  return {
    note: uiText("fixed"),
    tone: "normal",
    dims,
    ratioLabel,
    chip: `${dims} · 3×`,
    suggestSelection: false,
    blocked: false,
  };
}

function formatPx(value: number): string {
  return Math.ceil(value).toLocaleString(getFormatLocale());
}
