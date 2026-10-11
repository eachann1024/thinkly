import { useSettings } from "@/stores/settings";
import { applyTheme } from "@/stores/settings/theme";
import { applyAccentColor } from "./accentColor";
import { applyAppearanceScaleVariables } from "./appearance";
import { applyFontVariables } from "./fontLoader";
import { resolveTheme } from "./resolvedTheme";
import { readThemeSurfaceSnapshot } from "./themeSurfaceSnapshot";
import { APPEARANCE_KEYS, type AppearanceSnapshot } from "./appearance-contract";
import type { AssetAppearance } from "./asset-maintenance-contract";
let receiving = false;
let started = false;
let last = "";
export function getAppearanceSnapshot(): AppearanceSnapshot {
  const state = useSettings.getState();
  const fields = Object.fromEntries(APPEARANCE_KEYS.map((key) => [key, state[key]])) as AssetAppearance;
  // 读取真实 document 语义色；十六进制输出保证 Electron 背景颜色格式稳定。
  const background = readThemeSurfaceSnapshot().background;
  const rgb = background.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  const backgroundColor = rgb
    ? `#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`
    : background;
  return { ...fields, resolvedTheme: resolveTheme(state.theme), backgroundColor };
}
/** 接收时不重水合、不回写持久状态，避免覆盖其他窗口的业务设置。 */
export function applyAppearanceSnapshot(snapshot: AssetAppearance): void {
  receiving = true;
  try {
    const fields = Object.fromEntries(APPEARANCE_KEYS.filter((key) => key in snapshot).map((key) => [key, snapshot[key]]));
    useSettings.setState(fields);
    applyTheme(snapshot.theme);
    applyAccentColor(snapshot.accentColor);
    applyAppearanceScaleVariables(snapshot);
    applyFontVariables(snapshot.customFonts, snapshot);
    last = JSON.stringify(getAppearanceSnapshot());
  } finally { receiving = false; }
}
export function publishAppearanceSnapshot(): void {
  if (receiving || !useSettings.getState()._hasHydrated) return;
  const snapshot = getAppearanceSnapshot();
  const serialized = JSON.stringify(snapshot);
  if (serialized === last) return;
  last = serialized;
  window.gooseDesktop?.appearance?.publish(snapshot);
}
export function startAppearanceSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const storage = useSettings.persist.getOptions().storage;
  if (storage) useSettings.persist.setOptions({ storage: {
    ...storage,
    getItem: (key) => storage.getItem(key),
    removeItem: (key) => storage.removeItem(key),
    setItem: (key, value) => { if (!receiving) return storage.setItem(key, value); },
  } });
  useSettings.subscribe(() => {
    const state = useSettings.getState();
    if (!state._hasHydrated || receiving) return;
    if (JSON.stringify(getAppearanceSnapshot()) === last) return;
    applyTheme(state.theme);
    applyAccentColor(state.accentColor);
    applyAppearanceScaleVariables(state);
    applyFontVariables(state.customFonts, state);
    publishAppearanceSnapshot();
  });
  window.gooseDesktop?.appearance?.onChanged(applyAppearanceSnapshot);
  window.addEventListener("storage", (event) => {
    if (event.key !== "goose-note-settings" || !event.newValue) return;
    try {
      const state = JSON.parse(event.newValue).state;
      if (state?.theme && state?.customFonts) applyAppearanceSnapshot(state);
    } catch { /* 损坏的持久状态留给启动恢复处理。 */ }
  });
}
