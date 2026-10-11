import type { Theme } from "./types";
import { useSettings } from "./index";
import { applyAccentColor, syncAccentColorCssVars } from "@/lib/accentColor";
import { resolveCodeTheme } from "./types";
import { resolveTheme, subscribeResolvedTheme } from "@/lib/resolvedTheme";
import { startAppearanceSync, publishAppearanceSnapshot } from "@/lib/appearanceSync";

// 应用主题到 DOM
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const isDark = resolved === "dark";
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Re-apply code style when theme changes (because light/dark mode changed)
  const state = useSettings.getState();
  if (state) {
    applyCodeTheme();
    // 明暗切换后重刷 accent 运行时 token（含行内代码色）。
    // apply 可重复调用；sync 则按当前 data-goose-accent 重写，两者等价于兜底。
    applyAccentColor(state.accentColor);
    syncAccentColorCssVars();
  }
}

// 应用代码主题到 DOM
export function applyCodeTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  root.setAttribute("data-code-theme", resolveCodeTheme(isDark));
}

export function startSettingsThemeLifecycle() {
  // 监听系统主题变化
  if (typeof window !== "undefined") {
    startAppearanceSync();
    subscribeResolvedTheme(() => {
      applyTheme(useSettings.getState().theme);
      publishAppearanceSnapshot();
    });

    // 立即初始化主题（确保在 DOM 加载后立即应用）
    const initThemes = () => {
      const state = useSettings.getState();
      applyTheme(state.theme);
      applyAccentColor(state.accentColor);
      applyCodeTheme();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initThemes);
    } else {
      initThemes();
    }
  }
}
