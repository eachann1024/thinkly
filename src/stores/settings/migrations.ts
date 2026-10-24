import { normalizeFixedShortcutSettings } from "./slices/shortcutsSlice";
import {
  DEFAULT_QUICKNOTE_HOTKEY,
  DEFAULT_SEARCH_HOTKEY,
  LEGACY_DEFAULT_QUICKNOTE_HOTKEY,
  SIDEBAR_FONT_SIZE_DEFAULT,
  EDITOR_FONT_SIZE_DEFAULT,
  EDITOR_LINE_HEIGHT_DEFAULT,
  normalizeUIFontSize,
} from "./types";

const LEGACY_HARMONY_FONTS = new Set([
  "harmonyos sans",
  "harmonyos sans sc",
]);

function migrateLegacyHarmonyFont(value: unknown) {
  if (typeof value !== "string") return value;
  const name = value.trim().replace(/^["']+|["']+$/g, "").toLowerCase();
  return LEGACY_HARMONY_FONTS.has(name) ? null : value;
}

function migrateLegacyHarmonyFontStack(value: unknown) {
  if (typeof value !== "string") return value;
  const families = value.split(",");
  const remaining = families.filter((family) => {
    const name = family.trim().replace(/^["']+|["']+$/g, "").toLowerCase();
    return !LEGACY_HARMONY_FONTS.has(name);
  });
  return remaining.length === families.length
    ? value
    : remaining.length
      ? remaining.join(",")
      : null;
}

function migrateLegacyHarmonyFonts(state: Record<string, unknown>) {
  for (const key of ["uiFontFamily", "sidebarFontFamily"] as const) {
    const migrated = migrateLegacyHarmonyFont(state[key]);
    if (migrated !== state[key]) state[key] = migrated;
  }

  const fonts = state.customFonts;
  if (!fonts || typeof fonts !== "object" || Array.isArray(fonts)) return;

  let changed = false;
  const migratedFonts = { ...(fonts as Record<string, unknown>) };
  for (const key of ["default", "serif", "mono"] as const) {
    const config = migratedFonts[key];
    if (!config || typeof config !== "object" || Array.isArray(config)) continue;
    const current = config as Record<string, unknown>;
    const font = migrateLegacyHarmonyFontStack(current.font);
    if (font !== current.font) {
      migratedFonts[key] = { ...current, font };
      changed = true;
    }
  }
  if (changed) state.customFonts = migratedFonts;
}

export function migrateSettingsPersistedState(
  persistedState: unknown,
  version = 3,
): Record<string, unknown> {
  const state =
    persistedState && typeof persistedState === "object"
      ? { ...(persistedState as Record<string, unknown>) }
      : {};

  delete state.codeStyle;

  if (version < 9) migrateLegacyHarmonyFonts(state);

  if (version < 12 && state.uiFontFamily == null && state.sidebarFontFamily != null) {
    state.uiFontFamily = state.sidebarFontFamily;
  }
  delete state.sidebarFontFamily;

  if (
    typeof state.sidebarFontSize !== "number" ||
    !Number.isFinite(state.sidebarFontSize)
  ) {
    state.sidebarFontSize =
      state.uiFontSize === "normal" || state.uiFontSize === "large" ? 15 : SIDEBAR_FONT_SIZE_DEFAULT;
  }

  state.uiFontSize = normalizeUIFontSize(state.uiFontSize);

  if (version < 6) {
    if (state.editorFontSize === 16) state.editorFontSize = EDITOR_FONT_SIZE_DEFAULT;
    if (state.editorLineHeight === 1.5) state.editorLineHeight = EDITOR_LINE_HEIGHT_DEFAULT;
    if (state.defaultPageLayout === "compact") state.defaultPageLayout = "standard";
  }

  if (version < 8 && state.editorLineHeight === 1.95) {
    state.editorLineHeight = EDITOR_LINE_HEIGHT_DEFAULT;
  }

  if (version < 14 && state.editorLineHeight === 1.5) {
    state.editorLineHeight = EDITOR_LINE_HEIGHT_DEFAULT;
  }

  state.singleTabMode = true;
  if (typeof state.randomIconOnCreate !== "boolean") {
    state.randomIconOnCreate = false;
  }
  if (version < 13) state.showSidebarFolderCount = true;
  delete state.showPinnedTitles;

  delete state.globalEditorFullWidth;
  delete state.tableEvenColumnWidth;

  const desktop = state.desktop;
  if (desktop && typeof desktop === "object") {
    const desktopSettings = { ...(desktop as Record<string, unknown>) };
    let changed = false;
    if (version < 4 && desktopSettings.searchHotkey === "CmdOrCtrl+K") {
      desktopSettings.searchHotkey = DEFAULT_SEARCH_HOTKEY;
      changed = true;
    }
    if (
      version < 5 &&
      desktopSettings.quicknoteHotkey === LEGACY_DEFAULT_QUICKNOTE_HOTKEY
    ) {
      desktopSettings.quicknoteHotkey = DEFAULT_QUICKNOTE_HOTKEY;
      changed = true;
    }
    if (changed) {
      state.desktop = desktopSettings;
    }
  }

  return normalizeFixedShortcutSettings(state);
}
