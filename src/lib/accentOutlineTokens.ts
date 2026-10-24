import type { AccentColor } from "@/stores/settings/types";

const DARK_ACCENT: Record<AccentColor, string> = {
  ocean: "#779de8",
  iris: "#9484e5",
  pine: "#6aae83",
  coral: "#d28f68",
  rose: "#d486a0",
  grape: "#b088cc",
  mono: "#b3a575",
  amber: "#928365",
  wheat: "#838d69",
  claude: "#d97757",
};

const LIGHT_FOCUS: Record<AccentColor, string> = {
  ocean: "#547dd0",
  iris: "#8174cb",
  pine: "#559369",
  coral: "#b76e4a",
  rose: "#c16982",
  grape: "#9d6abf",
  mono: "#756b42",
  amber: "#877b63",
  wheat: "#7a7c63",
  claude: "#c6613f",
};

const ACCENT_TEXT: Record<AccentColor, [string, string]> = {
  ocean: ["#4668ad", "#779de8"],
  iris: ["#6a5fa6", "#a092e8"],
  pine: ["#437453", "#6aae83"],
  coral: ["#985b3d", "#d28f68"],
  rose: ["#985366", "#d487a1"],
  grape: ["#81579d", "#b58fcf"],
  mono: ["#6c623d", "#b3a575"],
  amber: ["#69604d", "#a99d85"],
  wheat: ["#60614e", "#99a284"],
  claude: ["#a4492b", "#e8a285"],
};

export function resolveAccentOutlineTokens(
  accentColor: AccentColor,
  isDark: boolean,
  lightBorder: string,
): Record<string, string> {
  const solid = isDark ? DARK_ACCENT[accentColor] : lightBorder;
  const focus = isDark ? solid : LIGHT_FOCUS[accentColor];
  return {
    "--goose-accent-solid": solid,
    "--goose-accent-text": ACCENT_TEXT[accentColor][isDark ? 1 : 0],
    "--goose-accent-outline-focus": focus,
    "--goose-accent-focus": focus,
    "--goose-interactive-selected-border": solid,
    "--goose-interactive-hover-border": solid,
  };
}
