import { applyAppearanceScaleVariables } from "@/lib/appearance";
import { applyAccentColor } from "@/lib/accentColor";
import { applyFontSmoothing, applyFontVariables, normalizeLocalFontName } from "@/lib/fontLoader";
import { normalizePageLayout } from "@/lib/local-frontmatter/settings";
import { readDbStorageJSON } from "@/lib/storage";
import { useSettings } from "@/stores/useSettings";
import { applyTheme } from "@/stores/settings/theme";
import { normalizeSidebarRailOrder } from "@/stores/settings/slices/sidebarRailSlice";
import {
  normalizeAccentColor,
  normalizeEditorFontSize,
  normalizeEditorLineHeight,
  normalizeUIFontSize,
  type CustomFonts,
  type Theme,
} from "@/stores/settings/types";
import { installElectronChrome } from "@/windows/chrome";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function readLaunchPersistedState(name: string, legacyName: string) {
  const saved = readDbStorageJSON<unknown>(name, null)
    ?? readDbStorageJSON<unknown>(legacyName, null);
  return record(record(saved).state);
}

// 只读预览现有同步缓存，不触发恢复、迁移或持久化。
// 设置 store 仍由正常初始化路径恢复。
export function readLaunchPreferences() {
  const saved = readLaunchPersistedState("thinkly-settings", "goose-note-settings");
  const defaults = useSettings.getState();
  const fonts = record(saved.customFonts);
  const customFonts = Object.fromEntries(
    (["default", "serif", "mono"] as const).map((key) => [key, {
      label: null,
      font: normalizeLocalFontName(record(fonts[key]).font ?? defaults.customFonts[key].font),
    }]),
  ) as unknown as CustomFonts;
  const theme: Theme = saved.theme === "light" || saved.theme === "dark" || saved.theme === "system"
    ? saved.theme : defaults.theme;
  return {
    hasCachedSettings: Object.keys(saved).length > 0,
    theme,
    customFonts,
    accentColor: normalizeAccentColor(saved.accentColor ?? defaults.accentColor),
    uiFontFamily: normalizeLocalFontName(saved.uiFontFamily ?? defaults.uiFontFamily),
    fontSmoothing: typeof saved.fontSmoothing === "boolean" ? saved.fontSmoothing : defaults.fontSmoothing,
    uiFontSize: normalizeUIFontSize(saved.uiFontSize ?? defaults.uiFontSize),
    editorFontSize: normalizeEditorFontSize(saved.editorFontSize ?? defaults.editorFontSize),
    editorLineHeight: normalizeEditorLineHeight(saved.editorLineHeight ?? defaults.editorLineHeight),
    defaultPageLayout: normalizePageLayout(saved.defaultPageLayout ?? defaults.defaultPageLayout),
    sidebarRailOrder: normalizeSidebarRailOrder(saved.sidebarRailOrder ?? defaults.sidebarRailOrder),
    aiEnabled: typeof record(saved.ai).enabled === "boolean"
      ? record(saved.ai).enabled as boolean : defaults.ai.enabled,
  };
}

export function prepareLaunchAppearance(): void {
  installElectronChrome();
  const preview = readLaunchPreferences();
  const paint = () => {
    if (useSettings.getState()._hasHydrated) return;
    applyTheme(preview.theme);
    applyAccentColor(preview.accentColor);
    applyFontVariables(preview.customFonts, preview);
    applyFontSmoothing(preview.fontSmoothing);
    applyAppearanceScaleVariables(preview);
  };
  paint();
  // 现有默认主题初始化也在 DOMContentLoaded 运行，恢复完成前保持缓存外观。
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", paint, { once: true });
}
