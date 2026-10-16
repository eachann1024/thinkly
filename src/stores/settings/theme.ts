import type { Theme } from "./types";
import { useSettings } from "./index";
import { applyAccentColor } from "@/lib/accentColor";
import { resolveCodeTheme } from "./types";
import { resolveTheme, subscribeResolvedTheme } from "@/lib/resolvedTheme";
import { startAppearanceSync, publishAppearanceSnapshot } from "@/lib/appearanceSync";

// 应用主题到 DOM
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const isDark = resolved === "dark";
  if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
  if (root.style.colorScheme !== resolved) root.style.colorScheme = resolved;

  if (root.classList.contains("dark") !== isDark) {
    root.classList.toggle("dark", isDark);
  }

  // Re-apply code style when theme changes (because light/dark mode changed)
  const state = useSettings.getState();
  if (state) {
    applyCodeTheme();
    // 明暗切换后重刷 accent 运行时 token（含行内代码色）。
    applyAccentColor(state.accentColor);
  }
}

// 应用代码主题到 DOM
export function applyCodeTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const codeTheme = resolveCodeTheme(isDark);
  if (root.getAttribute("data-code-theme") !== codeTheme) {
    root.setAttribute("data-code-theme", codeTheme);
  }
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
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initThemes);
    } else {
      initThemes();
    }
  }
}
