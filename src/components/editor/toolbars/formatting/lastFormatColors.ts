import { TEXT_COLORS, HIGHLIGHT_COLORS } from "./colorPalette";

const LAST_FORMAT_COLORS_KEY = "thinkly:last-format-colors";

const KNOWN_TEXT_COLORS = new Set(TEXT_COLORS.map((item) => item.color));
const KNOWN_BG_COLORS = new Set(HIGHLIGHT_COLORS.map((item) => item.color));

export type LastFormatColors = {
  textColor?: string;
  backgroundColor?: string;
};
export function selectionUsesLastFormatColors(
  selection: { textColor: string; backgroundColor: string },
  last: LastFormatColors,
): boolean {
  const remembered = (["textColor", "backgroundColor"] as const).filter(
    (key) => last[key] !== undefined,
  );
  return (
    remembered.length > 0 &&
    remembered.every((key) => selection[key] === last[key])
  );
}

function isKnownColor(value: unknown, known: Set<string>): value is string {
  return typeof value === "string" && known.has(value);
}

export function readLastFormatColors(): LastFormatColors {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAST_FORMAT_COLORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<LastFormatColors>;
    const next: LastFormatColors = {};
    if (isKnownColor(parsed.textColor, KNOWN_TEXT_COLORS)) {
      next.textColor = parsed.textColor;
    }
    if (isKnownColor(parsed.backgroundColor, KNOWN_BG_COLORS)) {
      next.backgroundColor = parsed.backgroundColor;
    }
    return next;
  } catch {
    return {};
  }
}

export function writeLastFormatColors(patch: LastFormatColors) {
  if (typeof window === "undefined") return;
  try {
    const current = readLastFormatColors();
    const next: LastFormatColors = { ...current };
    if (isKnownColor(patch.textColor, KNOWN_TEXT_COLORS)) {
      next.textColor = patch.textColor;
    }
    if (isKnownColor(patch.backgroundColor, KNOWN_BG_COLORS)) {
      next.backgroundColor = patch.backgroundColor;
    }
    if (next.textColor === undefined && next.backgroundColor === undefined) {
      return;
    }
    window.localStorage.setItem(LAST_FORMAT_COLORS_KEY, JSON.stringify(next));
  } catch {
  }
}
