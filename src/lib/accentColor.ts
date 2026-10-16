import { DEFAULT_ACCENT_COLOR, type AccentColor } from "@/stores/settings/types";
import { resolveAccentOutlineTokens } from "./accentOutlineTokens";

type AccentRuntimeTokens = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

// 深色交互表面保持中性灰，选中描边在输出时跟随所选强调色。
const NEUTRAL_DARK_RUNTIME_TOKENS: Record<string, string> = {
  "--goose-interactive-selected": "var(--goose-dark-selected-bg, #343434)",
  "--goose-interactive-selected-fg": "var(--goose-text-primary)",
  "--goose-sidebar-hover": "var(--goose-dark-hover-bg, #2c2c2c)",
  "--goose-interactive-hover": "var(--goose-dark-hover-bg, #2c2c2c)",
  "--goose-interactive-hover-fg": "var(--goose-text-primary)",
  "--goose-interactive-hover-border": "var(--goose-dark-interactive-border, #4a4a4a)",
  "--goose-inline-code-bg": "var(--goose-dark-inline-code-bg, #333333)",
  "--goose-inline-code-fg": "var(--goose-text-primary)",
  "--goose-inline-code-border-hover": "var(--goose-dark-interactive-border, #4a4a4a)",
  "--goose-editor-selection-bg": "var(--goose-dark-selection-bg, #444444)",
};

/**
 * 运行时直接写入的交互 token。
 * 浅色表面跟随强调色，深色表面共用中性灰；直接写入可避免
 * 旧内核 / 缓存 CSS 只命中部分变量。文字消费全局可读性色表。
 */
const ACCENT_RUNTIME_TOKENS: Record<AccentColor, AccentRuntimeTokens> = {
  iris: {
    light: {
      "--goose-interactive-selected": "#eceafa",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#8174cb",
      "--goose-sidebar-hover": "#f3f1fb",
      "--goose-interactive-hover": "#f3f1fb",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#8174cb",
      "--goose-inline-code-bg": "#eef2ff",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#c7d2fe",
      "--goose-editor-selection-bg": "#e0e7ff",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  ocean: {
    light: {
      "--goose-interactive-selected": "#e5edfc",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#547dd0",
      "--goose-sidebar-hover": "#eef3fc",
      "--goose-interactive-hover": "#eef3fc",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#547dd0",
      "--goose-inline-code-bg": "#eff6ff",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#bfdbfe",
      "--goose-editor-selection-bg": "#dbeafe",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  mono: {
    light: {
      "--goose-interactive-selected": "#fcfcf7",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#756b42",
      "--goose-sidebar-hover": "#e3e1d5",
      "--goose-interactive-hover": "#e3e1d5",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#756b42",
      "--goose-inline-code-bg": "#eeebde",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#756b42",
      "--goose-editor-selection-bg": "#eeebde",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  pine: {
    light: {
      "--goose-interactive-selected": "#e4f1e8",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#559369",
      "--goose-sidebar-hover": "#edf5ef",
      "--goose-interactive-hover": "#edf5ef",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#559369",
      "--goose-inline-code-bg": "#f0fdf4",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#bbf7d0",
      "--goose-editor-selection-bg": "#dcfce7",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  amber: {
    light: {
      "--goose-interactive-selected": "#fffdf7",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#c9b894",
      "--goose-sidebar-hover": "#e9dfc7",
      "--goose-interactive-hover": "#e9dfc7",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#c9b894",
      "--goose-inline-code-bg": "#efe6cf",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#c9b894",
      "--goose-editor-selection-bg": "#e9dfc7",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  wheat: {
    light: {
      "--goose-interactive-selected": "#fcfbf3",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#aeb18e",
      "--goose-sidebar-hover": "#e0ddc8",
      "--goose-interactive-hover": "#e0ddc8",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#aeb18e",
      "--goose-inline-code-bg": "#e9e7d4",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#aeb18e",
      "--goose-editor-selection-bg": "#e0ddc8",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  coral: {
    light: {
      "--goose-interactive-selected": "#fbeadf",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#b76e4a",
      "--goose-sidebar-hover": "#fcf2ec",
      "--goose-interactive-hover": "#fcf2ec",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#b76e4a",
      "--goose-inline-code-bg": "#fff7ed",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#fed7aa",
      "--goose-editor-selection-bg": "#ffedd5",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  rose: {
    light: {
      "--goose-interactive-selected": "#f8e7eb",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#c36a83",
      "--goose-sidebar-hover": "#fbf0f2",
      "--goose-interactive-hover": "#fbf0f2",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#c36a83",
      "--goose-inline-code-bg": "#fff1f2",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#fecdd3",
      "--goose-editor-selection-bg": "#ffe4e6",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  grape: {
    light: {
      "--goose-interactive-selected": "#f1e8f8",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#9d6abf",
      "--goose-sidebar-hover": "#f7f1fb",
      "--goose-interactive-hover": "#f7f1fb",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#9d6abf",
      "--goose-inline-code-bg": "#faf5ff",
      "--goose-inline-code-fg": "var(--goose-text-info)",
      "--goose-inline-code-border-hover": "#e9d5ff",
      "--goose-editor-selection-bg": "#f3e8ff",
    },
    dark: NEUTRAL_DARK_RUNTIME_TOKENS,
  },
  claude: {
    light: {
      "--goose-interactive-selected": "#f4e6dd",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-interactive-selected-border": "#c6613f",
      "--goose-sidebar-hover": "#ebe8df",
      "--goose-interactive-hover": "#ebe8df",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-interactive-hover-border": "#c6613f",
      "--goose-inline-code-bg": "#efece3",
      "--goose-inline-code-fg": "#a4492b",
      "--goose-inline-code-border-hover": "#c6613f",
      "--goose-editor-selection-bg": "#f5d6c6",
    },
    dark: {
      "--goose-interactive-selected": "#3a2d27",
      "--goose-interactive-selected-fg": "var(--goose-text-primary)",
      "--goose-sidebar-hover": "#2d2c2a",
      "--goose-interactive-hover": "#2d2c2a",
      "--goose-interactive-hover-fg": "var(--goose-text-primary)",
      "--goose-inline-code-bg": "#34322e",
      "--goose-inline-code-fg": "#eaa184",
      "--goose-editor-selection-bg": "#5b3b2d",
    },
  },
};

function isDarkDocument(root: Element): boolean {
  return root.classList.contains("dark");
}

export function resolveAccentRuntimeTokens(
  accentColor: AccentColor,
  isDark: boolean,
): Record<string, string> {
  const resolvedAccent = Object.hasOwn(ACCENT_RUNTIME_TOKENS, accentColor)
    ? accentColor
    : DEFAULT_ACCENT_COLOR;
  const tokens = ACCENT_RUNTIME_TOKENS[resolvedAccent];
  const theme = isDark ? tokens.dark : tokens.light;
  const selected = theme["--goose-interactive-selected"];
  const outline = resolveAccentOutlineTokens(
    resolvedAccent,
    isDark,
    tokens.light["--goose-interactive-selected-border"],
  );
  const tableAccent = isDark ? "#8caedc" : outline["--goose-accent-focus"];
  return {
    ...theme,
    ...outline,
    "--goose-table-selection-border": tableAccent,
    "--goose-table-selection-fill": `color-mix(in srgb, ${tableAccent} ${isDark ? 14 : 11}%, transparent)`,
    "--goose-table-selection-active": tableAccent,
    "--goose-table-selection-inactive": `color-mix(in srgb, ${tableAccent} 55%, transparent)`,
    "--goose-icon-chip-on-selected": selected,
  };
}

const RUNTIME_STYLE_ID = "goose-accent-runtime-vars";

function writeAccentRuntimeTokens(
  root: HTMLElement,
  accentColor: AccentColor,
): void {
  if (!root?.style?.setProperty) return;
  const tokens = resolveAccentRuntimeTokens(accentColor, isDarkDocument(root));
  for (const [name, value] of Object.entries(tokens)) {
    // 保留旧变量名，静态适配层负责具体控件颜色。
    if (root.style.getPropertyValue(name) !== value) {
      root.style.setProperty(name, value);
    }
  }

  // 清除旧版本热更新遗留的页面选择器；运行时只输出变量。
  document.getElementById(RUNTIME_STYLE_ID)?.remove();
}
/**
 * 应用强调色：
 * 1. 写 data-goose-accent，供静态 CSS preset 覆盖 primary 等其余 token
 * 2. 直接 setProperty 关键表面 token，避免仅靠选择器时行内代码掉回 iris fallback
 */
export function applyAccentColor(accentColor: AccentColor): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute("data-goose-accent") !== accentColor) {
    root.setAttribute("data-goose-accent", accentColor);
  }
  writeAccentRuntimeTokens(root, accentColor);
}

/**
 * 按当前 data-goose-accent + 明暗 class 重刷 runtime token。
 * 主题切换后应调用，避免仍停在上一模式的 inline-code vars。
 */
export function syncAccentColorCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root || typeof root.getAttribute !== "function") return;
  const accentAttr = root.getAttribute("data-goose-accent");
  const accentColor = (accentAttr ?? DEFAULT_ACCENT_COLOR) as AccentColor;
  writeAccentRuntimeTokens(root, accentColor);
}
