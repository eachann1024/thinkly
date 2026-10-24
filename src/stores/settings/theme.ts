import type { Theme } from "./types";
import { useSettings } from "./index";
import { applyAccentColor } from "@/lib/accentColor";
import { resolveCodeTheme } from "./types";
import { resolveTheme, subscribeResolvedTheme } from "@/lib/resolvedTheme";
import { startAppearanceSync, publishAppearanceSnapshot } from "@/lib/appearanceSync";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const isDark = resolved === "dark";
  if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
  if (root.style.colorScheme !== resolved) root.style.colorScheme = resolved;

  if (root.classList.contains("dark") !== isDark) {
    root.classList.toggle("dark", isDark);
  }

  const state = useSettings.getState();
  if (state) {
    applyCodeTheme();
    applyAccentColor(state.accentColor);
  }
}

export function applyCodeTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const codeTheme = resolveCodeTheme(isDark);
  if (root.getAttribute("data-code-theme") !== codeTheme) {
    root.setAttribute("data-code-theme", codeTheme);
  }
}

export function startSettingsThemeLifecycle() {
  if (typeof window !== "undefined") {
    startAppearanceSync();
    subscribeResolvedTheme(() => {
      applyTheme(useSettings.getState().theme);
      publishAppearanceSnapshot();
    });

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
