/**
 * 选区引用条的引号与关闭图标。
 * 装饰字符 ❞ 的墨迹贴在字框上沿，× 又落在基线上，弹性盒只能对齐字框，对不齐墨迹。
 * 这里改用实色图标，viewBox 与墨迹盒同心，行内再靠 flex 与文字中线对齐。
 */

/** 20px/单位栅格量出的引号墨迹，四周留出相同的 0.2 以免裁掉抗锯齿。 */
const QUOTE_INK = { left: 3.6, top: 4, right: 17.45, bottom: 12.35 };
const QUOTE_PAD = 0.2;

export const SELECTION_QUOTE_MARK = {
  path: "M6 4c1.7 0 3 1.5 3 3.4 0 1.4-.7 2.4-1.6 3 .6.3 1 .8 1 1.4 0 .3-.3.6-.7.6-.8 0-1.6-.6-2.1-1.4C4.4 10.2 3.6 8.8 3.6 7.4 3.6 5.5 4.7 4 6 4zm8.5 0c1.7 0 3 1.5 3 3.4 0 1.4-.7 2.4-1.6 3 .6.3 1 .8 1 1.4 0 .3-.3.6-.7.6-.8 0-1.6-.6-2.1-1.4-.9-.8-1.7-2.2-1.7-3.6 0-1.9 1.1-3.4 2.4-3.4z",
} as const;

/** 关闭叉从 6 画到 18，中心落在 24 视口的正中。尺寸贴近原来 15px「×」的墨迹高度。 */
export const SELECTION_QUOTE_CLOSE = {
  viewBox: 24,
  size: 14,
  arms: [
    [18, 6, 6, 18],
    [6, 6, 18, 18],
  ],
} as const;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function selectionQuoteMarkBox() {
  const { left, top, right, bottom } = QUOTE_INK;
  return {
    x: round2(left - QUOTE_PAD),
    y: round2(top - QUOTE_PAD),
    width: round2(right - left + QUOTE_PAD * 2),
    height: round2(bottom - top + QUOTE_PAD * 2),
  };
}

export function selectionQuoteMarkViewBoxAttr() {
  const box = selectionQuoteMarkBox();
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

export function selectionQuoteMarkAspect() {
  const box = selectionQuoteMarkBox();
  return `${box.width} / ${box.height}`;
}

/** 引号墨迹中线与 viewBox 中线重合，关闭叉的两条臂也穿过视口中心。 */
export function selectionQuoteIconsCentered() {
  const box = selectionQuoteMarkBox();
  const inkMid = (QUOTE_INK.top + QUOTE_INK.bottom) / 2;
  const boxMid = box.y + box.height / 2;
  const { viewBox, arms } = SELECTION_QUOTE_CLOSE;
  const armCentered = arms.every(([x1, y1, x2, y2]) => {
    return x1 + x2 === viewBox && y1 + y2 === viewBox;
  });
  return Math.abs(inkMid - boxMid) < 0.001 && armCentered;
}
