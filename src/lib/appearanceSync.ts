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
let publishPending = false;

function appearanceChanged(
  state: AssetAppearance,
  previous: AssetAppearance,
  key: typeof APPEARANCE_KEYS[number],
): boolean {
  if (state[key] === previous[key]) return false;
  return key !== "customFonts" ||
    JSON.stringify(state.customFonts) !== JSON.stringify(previous.customFonts);
}

function applyAppearanceChanges(
  state: AssetAppearance,
  previous?: AssetAppearance,
): void {
  const changed = (key: typeof APPEARANCE_KEYS[number]) =>
    !previous || appearanceChanged(state, previous, key);
  if (changed("theme")) applyTheme(state.theme);
  else if (changed("accentColor")) applyAccentColor(state.accentColor);
  if (changed("uiFontSize") || changed("editorFontSize") || changed("editorLineHeight")) {
    applyAppearanceScaleVariables(state);
  }
  if (changed("customFonts") || changed("uiFontFamily")) {
    applyFontVariables(state.customFonts, state);
  }
}

function appearanceSignature(): string {
  const state = useSettings.getState();
  return JSON.stringify([
    ...APPEARANCE_KEYS.map((key) => state[key]),
    resolveTheme(state.theme),
  ]);
}

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
  const previous = useSettings.getState();
  if (!APPEARANCE_KEYS.some((key) => key in snapshot && appearanceChanged(snapshot, previous, key))) return;
  receiving = true;
  try {
    const fields = Object.fromEntries(APPEARANCE_KEYS.filter((key) => key in snapshot).map((key) => [key, snapshot[key]]));
    useSettings.setState(fields);
    applyAppearanceChanges(useSettings.getState(), previous);
    last = appearanceSignature();
  } finally { receiving = false; }
}
export function publishAppearanceSnapshot(): void {
  if (receiving || publishPending || !useSettings.getState()._hasHydrated ||
    !window.gooseDesktop?.appearance) return;
  publishPending = true;
  // 等本轮设置与 DOM 写入结束后再采样，避免在每次 setState 中强制重算样式。
  queueMicrotask(() => {
    publishPending = false;
    const signature = appearanceSignature();
    if (signature === last) return;
    const snapshot = getAppearanceSnapshot();
    last = signature;
    window.gooseDesktop?.appearance?.publish(snapshot);
  });
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
  useSettings.subscribe((state, previous) => {
    if (!state._hasHydrated || receiving) return;
    if (previous._hasHydrated &&
      !APPEARANCE_KEYS.some((key) => appearanceChanged(state, previous, key))) return;
    applyAppearanceChanges(state, previous._hasHydrated ? previous : undefined);
    publishAppearanceSnapshot();
  });
  window.gooseDesktop?.appearance?.onChanged(applyAppearanceSnapshot);
  window.addEventListener("storage", (event) => {
    if (event.key !== "thinkly-settings" || !event.newValue) return;
    try {
      const state = JSON.parse(event.newValue).state;
      if (state?.theme && state?.customFonts) applyAppearanceSnapshot(state);
    } catch { /* 损坏的持久状态留给启动恢复处理。 */ }
  });
}
