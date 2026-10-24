import {
  EDITOR_FONT_SIZE_DEFAULT,
  SIDEBAR_FONT_SIZE_DEFAULT,
  normalizeUIFontSize,
  UI_FONT_SIZE_BASE,
  normalizeEditorLineHeight,
  type UIFontSize,
} from "@/stores/settings/types";
import { titleBarHeightPx } from "@/lib/electron/titlebarLayout";

export function computeUiFontSize(uiFontSize: UIFontSize): number {
  return UI_FONT_SIZE_BASE * normalizeUIFontSize(uiFontSize) / 100;
}

export function computeSidebarFontSize(uiFontSize: UIFontSize): number {
  return SIDEBAR_FONT_SIZE_DEFAULT * normalizeUIFontSize(uiFontSize) / 100;
}

export const EDITOR_UI_SCALE_CHANGE_EVENT = "goose-editor-ui-scale-change";

export function computeEditorUiScale(
  editorFontSize: number,
  localZoom = 1,
): string {
  const normalizedFontSize =
    Number.isFinite(editorFontSize) && editorFontSize > 0
      ? editorFontSize
      : EDITOR_FONT_SIZE_DEFAULT;
  const normalizedLocalZoom =
    Number.isFinite(localZoom) && localZoom > 0 ? localZoom : 1;
  return (
    (normalizedFontSize / EDITOR_FONT_SIZE_DEFAULT) *
    normalizedLocalZoom
  ).toFixed(4);
}

function applyEditorUiScale(root: HTMLElement, scale: string): void {
  if (root.style.getPropertyValue("--editor-ui-scale") === scale) return;
  root.style.setProperty("--editor-ui-scale", scale);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EDITOR_UI_SCALE_CHANGE_EVENT, {
        detail: { scale },
      }),
    );
  }
}

export function computeSidebarRowHeight(sidebarFontSize: number): number {
  return Math.round(sidebarFontSize / SIDEBAR_FONT_SIZE_DEFAULT * 32);
}

export function applyAppearanceScaleVariables(options: {
  uiFontSize: UIFontSize;
  editorFontSize: number;
  editorLineHeight?: number;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const targetUiSize = computeUiFontSize(options.uiFontSize);
  const sidebarFontSize = computeSidebarFontSize(options.uiFontSize);
  root.style.setProperty("font-size", `${targetUiSize}px`);
  root.style.setProperty("--editor-font-size", `${options.editorFontSize}px`);
  root.style.setProperty("--editor-base-font-size", `${EDITOR_FONT_SIZE_DEFAULT}px`);
  root.style.setProperty("--editor-line-height", String(normalizeEditorLineHeight(options.editorLineHeight)));
  root.style.setProperty("--sidebar-font-size", `${sidebarFontSize}px`);
  root.style.setProperty(
    "--editor-scale",
    (options.editorFontSize / EDITOR_FONT_SIZE_DEFAULT).toFixed(4),
  );
  applyEditorUiScale(root, computeEditorUiScale(options.editorFontSize));
  const titleBarHeight = titleBarHeightPx(targetUiSize);
  root.style.setProperty("--electron-titlebar-height", `${titleBarHeight}px`);
  if (typeof window !== "undefined") {
    void window.gooseDesktop?.syncTitleBarHeight?.(titleBarHeight);
  }
}

const STARTUP_SETTLING_ATTR = "data-startup-settling";

export function markStartupSettling(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(STARTUP_SETTLING_ATTR, "");
}

export function clearStartupSettling(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(STARTUP_SETTLING_ATTR);
}

export function releaseStartupSettlingAfterPaint(): void {
  if (typeof requestAnimationFrame === "undefined") {
    clearStartupSettling();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clearStartupSettling();
    });
  });
}
