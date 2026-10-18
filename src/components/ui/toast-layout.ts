/**
 * Toast 布局的唯一数值来源（纯 TS，不依赖 DOM / React）。
 * sonner.tsx 把这些值写成 Toaster 根上的 CSS 变量；toast/layout.css 只用变量计算，
 * 不再为某种 toast 单独写图标或关闭按钮的偏移。验收脚本 scripts/verify/toast.ts 也读这里。
 */
export const TOAST_LAYOUT = {
  /** 上下内边距 */
  padY: 12,
  /** 左右内边距 */
  padX: 16,
  /** 标题与正文行高：DESIGN.md body 13/20、control 14/20 */
  line: 20,
  /** 状态图标盒 */
  icon: 20,
  /** 关闭按钮：与 IconButton xs（24px）一致 */
  close: 24,
  /** 关闭按钮里的 X 图形 */
  closeGlyph: 16,
  /** 文案与关闭按钮之间的留白 */
  closeGap: 8,
  /** 图标与文案之间的间距 */
  gap: 12,
  /** 文案与换行后操作按钮之间的间距 */
  rowGap: 8,
  /** 外壳描边 */
  border: 1,
} as const;

export type ToastLayout = typeof TOAST_LAYOUT;

/** 图标相对内容区顶部的偏移：与第一行中线对齐。 */
export function toastIconOffset(layout: ToastLayout = TOAST_LAYOUT): number {
  return (layout.line - layout.icon) / 2;
}

/** 关闭按钮相对 padding box 顶部的位置：与第一行中线对齐。 */
export function toastCloseTop(layout: ToastLayout = TOAST_LAYOUT): number {
  return layout.padY + (layout.line - layout.close) / 2;
}

/** 关闭按钮右侧距离：让 X 图形右缘落在内边距线上，与左侧图标对称。 */
export function toastCloseRight(layout: ToastLayout = TOAST_LAYOUT): number {
  return layout.padX - (layout.close - layout.closeGlyph) / 2;
}

/** 内容区需为关闭按钮让出的右侧空间。 */
export function toastContentReserve(layout: ToastLayout = TOAST_LAYOUT): number {
  return toastCloseRight(layout) + layout.close + layout.closeGap - layout.padX;
}

/** 写到 Toaster 根上的 CSS 变量。 */
export function toastLayoutCssVars(layout: ToastLayout = TOAST_LAYOUT): Record<string, string> {
  return {
    "--goose-toast-pad-y": `${layout.padY}px`,
    "--goose-toast-pad-x": `${layout.padX}px`,
    "--goose-toast-line": `${layout.line}px`,
    "--goose-toast-icon": `${layout.icon}px`,
    "--goose-toast-close": `${layout.close}px`,
    "--goose-toast-close-right": `${toastCloseRight(layout)}px`,
    "--goose-toast-content-reserve": `${toastContentReserve(layout)}px`,
    "--goose-toast-gap": `${layout.gap}px`,
    "--goose-toast-row-gap": `${layout.rowGap}px`,
  };
}

export type ToastGeometryInput = {
  /** 文案（标题 + 描述）总行数 */
  lines: number;
  /** 操作按钮高度；有值时按钮换到下一整行 */
  actionHeight?: number;
};

export type ToastGeometry = {
  height: number;
  firstLineCenter: number;
  iconCenter: number;
  closeTop: number;
  closeCenter: number;
};

/** 按 CSS 规则推算一条 toast 的几何（坐标相对 border box 顶部）。 */
export function toastGeometry(
  { lines, actionHeight }: ToastGeometryInput,
  layout: ToastLayout = TOAST_LAYOUT,
): ToastGeometry {
  const textHeight = Math.max(lines, 1) * layout.line;
  const row1 = Math.max(textHeight, toastIconOffset(layout) + layout.icon);
  const body = actionHeight ? row1 + layout.rowGap + actionHeight : row1;
  const contentTop = layout.border + layout.padY;
  const closeTop = toastCloseTop(layout);
  return {
    height: layout.border * 2 + layout.padY * 2 + body,
    firstLineCenter: contentTop + layout.line / 2,
    iconCenter: contentTop + toastIconOffset(layout) + layout.icon / 2,
    closeTop,
    closeCenter: layout.border + closeTop + layout.close / 2,
  };
}
