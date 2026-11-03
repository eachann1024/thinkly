import type { CardTheme } from "./types";
import { TECH_THEMES } from "./presets/tech";
import { ARTISTIC_THEMES } from "./presets/artistic";
import { COLORFUL_THEMES } from "./presets/colorful";
import {
  NOTEBOOK_THEME,
  buildNotebookCardTheme,
  type NotebookCardThemeContext,
} from "./presets/notebook";
import { ORIGINAL_THEME, buildOriginalCardTheme } from "./presets/original";

export type { NotebookCardThemeContext } from "./presets/notebook";
export { buildNotebookCardTheme, NOTEBOOK_THEME } from "./presets/notebook";
export { buildOriginalCardTheme, ORIGINAL_THEME } from "./presets/original";

const findTheme = (id: string): CardTheme => {
  if (id === "notebook") return NOTEBOOK_THEME;
  if (id === "original") return ORIGINAL_THEME;
  const all = [...TECH_THEMES, ...ARTISTIC_THEMES, ...COLORFUL_THEMES];
  const found = all.find((t) => t.id === id);
  if (!found) throw new Error(`Theme ${id} not found in presets!`);
  return found;
};

const CARD_THEME_IDS = [
  "original",
  "stationery",
  "mocha-mousse",
  "brutalist",
  "notebook",
  "medium",
  "kenya-hara",
  "typewriter",
  "risograph",
  "poster",
  "vercel-dark",
  "tokyo-night",
  "catppuccin",
  "synthwave",
] as const;

export type CardThemeId = (typeof CARD_THEME_IDS)[number];

export const CARD_THEMES: Array<CardTheme & { id: CardThemeId }> =
  CARD_THEME_IDS.map((id) => findTheme(id) as CardTheme & { id: CardThemeId });

const REMOVED_THEME_REPLACEMENTS: Record<string, CardThemeId> = {
  notion: "notebook",
  obsidian: "notebook",
  academic: "medium",
  linear: "notebook",
  "github-light": "notebook",
  "github-dark": "notebook",
  "solarized-light": "typewriter",
  neon: "risograph",
};

export function normalizeCardThemeId(themeId: unknown): CardThemeId {
  if (typeof themeId === "string") {
    const activeTheme = CARD_THEME_IDS.find((id) => id === themeId);
    if (activeTheme) return activeTheme;
    const replacement = REMOVED_THEME_REPLACEMENTS[themeId];
    if (replacement) return replacement;
  }
  return "notebook";
}

export function getCardTheme(themeId: CardThemeId): CardTheme {
  return CARD_THEMES.find((t) => t.id === themeId) ?? CARD_THEMES[0];
}

export function resolveCardTheme(
  themeId: CardThemeId,
  ctx?: NotebookCardThemeContext,
): CardTheme {
  const id = normalizeCardThemeId(themeId);
  if (id === "notebook") return buildNotebookCardTheme(ctx);
  if (id === "original") return buildOriginalCardTheme(ctx);
  return getCardTheme(id);
}
