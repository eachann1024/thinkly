export const TOAST_LAYOUT = {
  padY: 12,
  padX: 16,
  line: 20,
  icon: 20,
  close: 24,
  closeGlyph: 16,
  closeGap: 8,
  gap: 12,
  rowGap: 8,
  action: 24,
  border: 1,
} as const;

export type ToastLayout = typeof TOAST_LAYOUT;

export function toastIconOffset(layout: ToastLayout = TOAST_LAYOUT): number {
  return (layout.line - layout.icon) / 2;
}

export function toastActionMargin(layout: ToastLayout = TOAST_LAYOUT): number {
  return (layout.line - layout.action) / 2;
}

export function toastCloseTop(layout: ToastLayout = TOAST_LAYOUT): number {
  return layout.padY + (layout.line - layout.close) / 2;
}

export function toastCloseRight(layout: ToastLayout = TOAST_LAYOUT): number {
  return layout.padX - (layout.close - layout.closeGlyph) / 2;
}

export function toastContentReserve(layout: ToastLayout = TOAST_LAYOUT): number {
  return toastCloseRight(layout) + layout.close + layout.closeGap - layout.padX;
}

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
    "--goose-toast-action": `${layout.action}px`,
  };
}

export type ToastGeometryInput = {
  lines: number;
  action?: boolean;
};

export type ToastGeometry = {
  height: number;
  firstLineCenter: number;
  iconCenter: number;
  closeTop: number;
  closeCenter: number;
  actionCenter?: number;
};

export function toastGeometry(
  { lines, action }: ToastGeometryInput,
  layout: ToastLayout = TOAST_LAYOUT,
): ToastGeometry {
  const textHeight = Math.max(lines, 1) * layout.line;
  const row1 = Math.max(textHeight, toastIconOffset(layout) + layout.icon);
  const body = action ? Math.max(row1, layout.action + toastActionMargin(layout) * 2) : row1;
  const contentTop = layout.border + layout.padY;
  const closeTop = toastCloseTop(layout);
  return {
    height: layout.border * 2 + layout.padY * 2 + body,
    firstLineCenter: contentTop + layout.line / 2,
    iconCenter: contentTop + toastIconOffset(layout) + layout.icon / 2,
    closeTop,
    closeCenter: layout.border + closeTop + layout.close / 2,
    actionCenter: action ? contentTop + toastActionMargin(layout) + layout.action / 2 : undefined,
  };
}
